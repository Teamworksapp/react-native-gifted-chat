import * as utils from './utils';
import { ActionSheetProvider, } from '@expo/react-native-action-sheet';
import { Animated, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, View, } from 'react-native';
import { DATE_FORMAT, DEFAULT_PLACEHOLDER, MAX_COMPOSER_HEIGHT, MIN_COMPOSER_HEIGHT, TIME_FORMAT, } from './Constant';
import React from 'react';
import Actions from './Actions';
import Avatar from './Avatar';
import Bubble from './Bubble';
import Composer from './Composer';
import Day from './Day';
import GiftedAvatar from './GiftedAvatar';
import InputToolbar from './InputToolbar';
import LoadEarlier from './LoadEarlier';
import Message from './Message';
import MessageContainer from './MessageContainer';
import MessageImage from './MessageImage';
import MessageText from './MessageText';
import PropTypes from 'prop-types';
import Send from './Send';
import SystemMessage from './SystemMessage';
import Time from './Time';
import dayjs from 'dayjs';
import { getBottomSpace } from 'react-native-iphone-x-helper';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import uuid from 'uuid';
dayjs.extend(localizedFormat);
class GiftedChat extends React.PureComponent {
    constructor(props) {
        super(props);
        this._isMounted = false;
        this._keyboardHeight = 0;
        this._bottomOffset = 0;
        this._maxHeight = undefined;
        this._isFirstLayout = true;
        this._locale = 'en';
        this.invertibleScrollViewProps = undefined;
        this._actionSheetRef = undefined;
        this._messageContainerRef = undefined;
        this.state = {
            isInitialized: false,
            composerHeight: this.props.minComposerHeight,
            messagesContainerHeight: undefined,
            typingDisabled: false,
            text: undefined,
            messages: this.props.messages,
        };
        this.getLocale = () => this._locale;
        this.safeAreaSupport = (bottomOffset) => {
            return bottomOffset === this._bottomOffset
                ? this.getBottomOffset()
                    ? this.getBottomOffset()
                    : getBottomSpace()
                : bottomOffset;
        };
        this.onKeyboardWillShow = (e) => {
            if (this.props.isKeyboardInternallyHandled) {
                this.setIsTypingDisabled(true);
                this.setKeyboardHeight(e.endCoordinates ? e.endCoordinates.height : e.end.height);
                this.setBottomOffset(this.safeAreaSupport(this.props.bottomOffset));
                const newMessagesContainerHeight = this.getMessagesContainerHeightWithKeyboard();
                this.setState({
                    messagesContainerHeight: newMessagesContainerHeight,
                });
            }
        };
        this.onKeyboardWillHide = (_e) => {
            if (this.props.isKeyboardInternallyHandled) {
                this.setIsTypingDisabled(true);
                this.setKeyboardHeight(0);
                this.setBottomOffset(0);
                const newMessagesContainerHeight = this.getBasicMessagesContainerHeight();
                this.setState({
                    messagesContainerHeight: newMessagesContainerHeight,
                });
            }
        };
        this.onKeyboardDidShow = (e) => {
            if (Platform.OS === 'android') {
                this.onKeyboardWillShow(e);
            }
            this.setIsTypingDisabled(false);
        };
        this.onKeyboardDidHide = (e) => {
            if (Platform.OS === 'android') {
                this.onKeyboardWillHide(e);
            }
            this.setIsTypingDisabled(false);
        };
        this.onSend = (messages = [], shouldResetInputToolbar = false) => {
            if (!Array.isArray(messages)) {
                messages = [messages];
            }
            const newMessages = messages.map(message => {
                return {
                    ...message,
                    user: this.props.user,
                    createdAt: new Date(),
                    _id: this.props.messageIdGenerator && this.props.messageIdGenerator(),
                };
            });
            if (shouldResetInputToolbar === true) {
                this.setIsTypingDisabled(true);
                this.resetInputToolbar();
            }
            if (this.props.onSend) {
                this.props.onSend(newMessages);
            }
            if (shouldResetInputToolbar === true) {
                setTimeout(() => {
                    if (this.getIsMounted() === true) {
                        this.setIsTypingDisabled(false);
                    }
                }, 100);
            }
        };
        this.onInputSizeChanged = (size) => {
            const newComposerHeight = Math.max(this.props.minComposerHeight, Math.min(this.props.maxComposerHeight, size.height));
            const newMessagesContainerHeight = this.getMessagesContainerHeightWithKeyboard(newComposerHeight);
            this.setState({
                composerHeight: newComposerHeight,
                messagesContainerHeight: newMessagesContainerHeight,
            });
        };
        this.onInputTextChanged = (text) => {
            if (this.getIsTypingDisabled()) {
                return;
            }
            if (this.props.onInputTextChanged) {
                this.props.onInputTextChanged(text);
            }
            // Only set state if it's not being overridden by a prop.
            if (this.props.text === undefined) {
                this.setState({ text });
            }
        };
        this.onInitialLayoutViewLayout = (e) => {
            const { layout } = e.nativeEvent;
            if (layout.height <= 0) {
                return;
            }
            this.notifyInputTextReset();
            this.setMaxHeight(layout.height);
            const newComposerHeight = this.props.minComposerHeight;
            const newMessagesContainerHeight = this.getMessagesContainerHeightWithKeyboard(newComposerHeight);
            const initialText = this.props.initialText || '';
            this.setState({
                isInitialized: true,
                text: this.getTextFromProp(initialText),
                composerHeight: newComposerHeight,
                messagesContainerHeight: newMessagesContainerHeight,
            });
        };
        this.onMainViewLayout = (e) => {
            // fix an issue when keyboard is dismissing during the initialization
            const { layout } = e.nativeEvent;
            if (this.getMaxHeight() !== layout.height ||
                this.getIsFirstLayout() === true) {
                this.setMaxHeight(layout.height);
                this.setState({
                    messagesContainerHeight: this._keyboardHeight > 0
                        ? this.getMessagesContainerHeightWithKeyboard()
                        : this.getBasicMessagesContainerHeight(),
                });
            }
            if (this.getIsFirstLayout() === true) {
                this.setIsFirstLayout(false);
            }
        };
        this.invertibleScrollViewProps = {
            inverted: this.props.inverted || this.props.fakeInverted,
            keyboardShouldPersistTaps: this.props.keyboardShouldPersistTaps,
            onKeyboardWillShow: this.onKeyboardWillShow,
            onKeyboardWillHide: this.onKeyboardWillHide,
            onKeyboardDidShow: this.onKeyboardDidShow,
            onKeyboardDidHide: this.onKeyboardDidHide,
        };
        this.getListRef = this.getListRef.bind(this);
    }
    static append(currentMessages = [], messages, inverted = true) {
        if (!Array.isArray(messages)) {
            messages = [messages];
        }
        return inverted
            ? messages.concat(currentMessages)
            : currentMessages.concat(messages);
    }
    static prepend(currentMessages = [], messages, inverted = true) {
        if (!Array.isArray(messages)) {
            messages = [messages];
        }
        return inverted
            ? currentMessages.concat(messages)
            : messages.concat(currentMessages);
    }
    getChildContext() {
        return {
            actionSheet: this.props.actionSheet || (() => this._actionSheetRef.getContext()),
            getLocale: this.getLocale,
        };
    }
    componentDidMount() {
        const { messages, text } = this.props;
        this.setIsMounted(true);
        this.initLocale();
        this.setMessages(messages || []);
        this.setTextFromProp(text);
    }
    componentWillUnmount() {
        this.setIsMounted(false);
    }
    componentDidUpdate(prevProps = {}) {
        const { messages, text, inverted, renderMessage, renderMessageText, renderMessageImage, fakeInverted, } = this.props;
        const messagesNeedUpdate = messages !== prevProps.messages ||
            (messages &&
                prevProps.messages &&
                messages.length !== prevProps.messages.length) ||
            renderMessage !== prevProps.renderMessage ||
            renderMessageText !== prevProps.renderMessageText ||
            renderMessageImage !== prevProps.renderMessageImage;
        const textNeedsUpdate = text !== undefined && text !== prevProps.text ? text : this.state.text;
        if (messagesNeedUpdate || textNeedsUpdate) {
            this.setState(({ messages: prevMessages, text: prevText }) => ({
                messages: messagesNeedUpdate ? messages || [] : prevMessages,
                text: textNeedsUpdate ? text : prevText,
            }));
        }
        if (inverted === false &&
            !fakeInverted &&
            messages &&
            (messages !== prevProps.messages ||
                (prevProps.messages && messages.length !== prevProps.messages.length))) {
            setTimeout(() => this.scrollToBottom(false), 200);
        }
    }
    initLocale() {
        if (this.props.locale === null) {
            this.setLocale('en');
        }
        else {
            this.setLocale(this.props.locale || 'en');
        }
    }
    setLocale(locale) {
        this._locale = locale;
    }
    setTextFromProp(textProp) {
        // Text prop takes precedence over state.
        if (textProp !== undefined && textProp !== this.state.text) {
            this.setState({ text: textProp });
        }
    }
    getTextFromProp(fallback) {
        if (this.props.text === undefined) {
            return fallback;
        }
        return this.props.text;
    }
    setMessages(messages) {
        this.setState({ messages });
    }
    getMessages() {
        return this.state.messages;
    }
    setMaxHeight(height) {
        this._maxHeight = height;
    }
    getMaxHeight() {
        return this._maxHeight;
    }
    setKeyboardHeight(height) {
        this._keyboardHeight = height;
    }
    getKeyboardHeight() {
        if (Platform.OS === 'android' && !this.props.forceGetKeyboardHeight) {
            // For android: on-screen keyboard resized main container and has own height.
            // @see https://developer.android.com/training/keyboard-input/visibility.html
            // So for calculate the messages container height ignore keyboard height.
            return 0;
        }
        return this._keyboardHeight;
    }
    setBottomOffset(value) {
        this._bottomOffset = value;
    }
    getBottomOffset() {
        return this._bottomOffset;
    }
    setIsFirstLayout(value) {
        this._isFirstLayout = value;
    }
    getIsFirstLayout() {
        return this._isFirstLayout;
    }
    setIsTypingDisabled(value) {
        this.setState({
            typingDisabled: value,
        });
    }
    getIsTypingDisabled() {
        return this.state.typingDisabled;
    }
    setIsMounted(value) {
        this._isMounted = value;
    }
    getIsMounted() {
        return this._isMounted;
    }
    getMinInputToolbarHeight() {
        return this.props.renderAccessory
            ? this.props.minInputToolbarHeight * 2
            : this.props.minInputToolbarHeight;
    }
    calculateInputToolbarHeight(composerHeight) {
        return (composerHeight +
            (this.getMinInputToolbarHeight() - this.props.minComposerHeight));
    }
    /**
     * Returns the height, based on current window size, without taking the keyboard into account.
     */
    getBasicMessagesContainerHeight(composerHeight = this.state.composerHeight) {
        return (this.getMaxHeight() - this.calculateInputToolbarHeight(composerHeight));
    }
    /**
     * Returns the height, based on current window size, taking the keyboard into account.
     */
    getMessagesContainerHeightWithKeyboard(composerHeight = this.state.composerHeight) {
        return (this.getBasicMessagesContainerHeight(composerHeight) -
            this.getKeyboardHeight() +
            this.getBottomOffset());
    }
    scrollToBottom(animated = true) {
        if (this._messageContainerRef) {
            const { inverted, fakeInverted } = this.props;
            if (!inverted && !fakeInverted) {
                this._messageContainerRef.scrollToEnd({ animated });
            }
            else {
                this._messageContainerRef.scrollToOffset({
                    offset: 0,
                    animated,
                });
            }
        }
    }
    getListRef(flatList) {
        this._messageContainerRef = flatList;
        if (typeof this.props.listRef === 'function') {
            this.props.listRef(flatList);
        }
        else if (this.props.listRef) {
            this.props.listRef.current = flatList;
        }
    }
    renderMessages() {
        const { messagesContainerStyle, ...messagesContainerProps } = this.props;
        const fragment = (<Animated.View style={[
            {
                height: this.state.messagesContainerHeight,
            },
            messagesContainerStyle,
        ]}>
        <View style={[
            styles.container,
            messagesContainerProps.fakeInverted && styles.fakeInvert,
        ]}>
          <MessageContainer {...messagesContainerProps} invertibleScrollViewProps={this.invertibleScrollViewProps} messages={this.getMessages()} forwardRef={this.getListRef} isTyping={this.props.isTyping}/>
        </View>
        {this.renderChatFooter()}
      </Animated.View>);
        return this.props.isKeyboardInternallyHandled ? (<KeyboardAvoidingView enabled>{fragment}</KeyboardAvoidingView>) : (fragment);
    }
    resetInputToolbar() {
        if (this.textInput) {
            this.textInput.clear();
        }
        this.notifyInputTextReset();
        const newComposerHeight = this.props.minComposerHeight;
        const newMessagesContainerHeight = this.getMessagesContainerHeightWithKeyboard(newComposerHeight);
        this.setState({
            text: this.getTextFromProp(''),
            composerHeight: newComposerHeight,
            messagesContainerHeight: newMessagesContainerHeight,
        });
    }
    focusTextInput() {
        if (this.textInput) {
            this.textInput.focus();
        }
    }
    notifyInputTextReset() {
        if (this.props.onInputTextChanged) {
            this.props.onInputTextChanged('');
        }
    }
    renderInputToolbar() {
        const inputToolbarProps = {
            ...this.props,
            text: this.getTextFromProp(this.state.text),
            composerHeight: Math.max(this.props.minComposerHeight, this.state.composerHeight),
            onSend: this.onSend,
            onInputSizeChanged: this.onInputSizeChanged,
            onTextChanged: this.onInputTextChanged,
            textInputProps: {
                ...this.props.textInputProps,
                ref: (textInput) => (this.textInput = textInput),
                maxLength: this.getIsTypingDisabled() ? 0 : this.props.maxInputLength,
            },
        };
        if (this.props.renderInputToolbar) {
            return this.props.renderInputToolbar(inputToolbarProps);
        }
        return <InputToolbar {...inputToolbarProps}/>;
    }
    renderChatFooter() {
        if (this.props.renderChatFooter) {
            return this.props.renderChatFooter();
        }
        return null;
    }
    renderLoading() {
        if (this.props.renderLoading) {
            return this.props.renderLoading();
        }
        return null;
    }
    render() {
        if (this.state.isInitialized === true) {
            const { wrapInSafeArea } = this.props;
            const Wrapper = wrapInSafeArea ? SafeAreaView : View;
            return (<Wrapper style={styles.safeArea}>
          <ActionSheetProvider ref={(component) => (this._actionSheetRef = component)}>
            <View style={styles.container} onLayout={this.onMainViewLayout}>
              {this.renderMessages()}
              {this.renderInputToolbar()}
            </View>
          </ActionSheetProvider>
        </Wrapper>);
        }
        return (<View style={styles.container} onLayout={this.onInitialLayoutViewLayout}>
        {this.renderLoading()}
      </View>);
    }
}
GiftedChat.childContextTypes = {
    actionSheet: PropTypes.func,
    getLocale: PropTypes.func,
};
GiftedChat.defaultProps = {
    messages: [],
    messagesContainerStyle: undefined,
    text: undefined,
    placeholder: DEFAULT_PLACEHOLDER,
    disableComposer: false,
    messageIdGenerator: () => uuid.v4(),
    user: {},
    onSend: () => { },
    locale: null,
    timeFormat: TIME_FORMAT,
    dateFormat: DATE_FORMAT,
    loadEarlier: false,
    onLoadEarlier: () => { },
    isLoadingEarlier: false,
    renderLoading: null,
    renderLoadEarlier: null,
    renderAvatar: undefined,
    showUserAvatar: false,
    actionSheet: null,
    onPressAvatar: null,
    onLongPressAvatar: null,
    renderUsernameOnMessage: false,
    renderAvatarOnTop: false,
    renderBubble: null,
    renderSystemMessage: null,
    onLongPress: null,
    renderMessage: null,
    renderMessageText: null,
    renderMessageImage: null,
    imageProps: {},
    videoProps: {},
    audioProps: {},
    lightboxProps: {},
    textInputProps: {},
    listViewProps: {},
    renderCustomView: null,
    isCustomViewBottom: false,
    renderDay: null,
    renderTime: null,
    renderFooter: null,
    renderChatEmpty: null,
    renderChatFooter: null,
    renderInputToolbar: null,
    renderComposer: null,
    renderActions: null,
    renderSend: null,
    renderAccessory: null,
    isKeyboardInternallyHandled: true,
    onPressActionButton: null,
    bottomOffset: 0,
    minInputToolbarHeight: 44,
    keyboardShouldPersistTaps: Platform.select({
        ios: 'never',
        android: 'always',
        default: 'never',
    }),
    onInputTextChanged: null,
    maxInputLength: null,
    forceGetKeyboardHeight: false,
    inverted: true,
    extraData: null,
    minComposerHeight: MIN_COMPOSER_HEIGHT,
    maxComposerHeight: MAX_COMPOSER_HEIGHT,
    wrapInSafeArea: true,
};
GiftedChat.propTypes = {
    messages: PropTypes.arrayOf(PropTypes.object),
    messagesContainerStyle: utils.StylePropType,
    text: PropTypes.string,
    initialText: PropTypes.string,
    placeholder: PropTypes.string,
    disableComposer: PropTypes.bool,
    messageIdGenerator: PropTypes.func,
    user: PropTypes.object,
    onSend: PropTypes.func,
    locale: PropTypes.string,
    timeFormat: PropTypes.string,
    dateFormat: PropTypes.string,
    isKeyboardInternallyHandled: PropTypes.bool,
    loadEarlier: PropTypes.bool,
    onLoadEarlier: PropTypes.func,
    isLoadingEarlier: PropTypes.bool,
    renderLoading: PropTypes.func,
    renderLoadEarlier: PropTypes.func,
    renderAvatar: PropTypes.func,
    showUserAvatar: PropTypes.bool,
    actionSheet: PropTypes.func,
    onPressAvatar: PropTypes.func,
    onLongPressAvatar: PropTypes.func,
    renderUsernameOnMessage: PropTypes.bool,
    renderAvatarOnTop: PropTypes.bool,
    isCustomViewBottom: PropTypes.bool,
    renderBubble: PropTypes.func,
    renderSystemMessage: PropTypes.func,
    onLongPress: PropTypes.func,
    renderMessage: PropTypes.func,
    renderMessageText: PropTypes.func,
    renderMessageImage: PropTypes.func,
    imageProps: PropTypes.object,
    videoProps: PropTypes.object,
    audioProps: PropTypes.object,
    lightboxProps: PropTypes.object,
    renderCustomView: PropTypes.func,
    renderDay: PropTypes.func,
    renderTime: PropTypes.func,
    renderFooter: PropTypes.func,
    renderChatEmpty: PropTypes.func,
    renderChatFooter: PropTypes.func,
    renderInputToolbar: PropTypes.func,
    renderComposer: PropTypes.func,
    renderActions: PropTypes.func,
    renderSend: PropTypes.func,
    renderAccessory: PropTypes.func,
    onPressActionButton: PropTypes.func,
    bottomOffset: PropTypes.number,
    minInputToolbarHeight: PropTypes.number,
    listViewProps: PropTypes.object,
    keyboardShouldPersistTaps: PropTypes.oneOf(['always', 'never', 'handled']),
    onInputTextChanged: PropTypes.func,
    maxInputLength: PropTypes.number,
    forceGetKeyboardHeight: PropTypes.bool,
    inverted: PropTypes.bool,
    fakeInverted: PropTypes.bool,
    textInputProps: PropTypes.object,
    extraData: PropTypes.object,
    minComposerHeight: PropTypes.number,
    maxComposerHeight: PropTypes.number,
    alignTop: PropTypes.bool,
    wrapInSafeArea: PropTypes.bool,
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    fakeInvert: {
        transform: [{ rotate: '180deg' }],
    },
});
export * from './Models';
export { GiftedChat, Actions, Avatar, Bubble, SystemMessage, MessageImage, MessageText, Composer, Day, InputToolbar, LoadEarlier, Message, MessageContainer, Send, Time, GiftedAvatar, utils, };
//# sourceMappingURL=GiftedChat.js.map
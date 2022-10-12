import { FlatList, Keyboard, Platform, StyleSheet, Text, TouchableOpacity, View, } from 'react-native';
import React from 'react';
import { StylePropType, warning } from './utils';
import Color from './Color';
import LoadEarlier from './LoadEarlier';
import Message from './Message';
import PropTypes from 'prop-types';
import TypingIndicator from './TypingIndicator';
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    containerAlignTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    contentContainerStyle: {
        flexGrow: 1,
        justifyContent: 'flex-start',
    },
    emptyChatContainer: {
        flex: 1,
        transform: [{ scaleY: -1 }],
    },
    headerWrapper: {
        flex: 1,
    },
    listStyle: {
        flex: 1,
    },
    scrollToBottomStyle: {
        opacity: 0.8,
        position: 'absolute',
        right: 10,
        bottom: 30,
        zIndex: 999,
        height: 40,
        width: 40,
        borderRadius: 20,
        backgroundColor: Color.white,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: Color.black,
        shadowOpacity: 0.5,
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 1,
    },
});
export default class MessageContainer extends React.PureComponent {
    constructor(props) {
        super(props);
        this._listRef = undefined;
        this._listRecorded = false;
        this.state = {
            showScrollBottom: false,
            extraData: [this.props.extraData, this.props.isTyping],
        };
        // 0.16.3-patch: https://github.com/FaridSafi/react-native-gifted-chat/issues/2112#issue-1000416894
        this.attachKeyboardListeners = () => {
            const { invertibleScrollViewProps: invertibleProps } = this.props;
            if (invertibleProps) {
                this.detachKeyboardListeners();
                // Keyboard.addListener(
                //   'keyboardWillShow',
                //   invertibleProps.onKeyboardWillShow,
                // )
                // Keyboard.addListener('keyboardDidShow', invertibleProps.onKeyboardDidShow)
                // Keyboard.addListener(
                //   'keyboardWillHide',
                //   invertibleProps.onKeyboardWillHide,
                // )
                // Keyboard.addListener('keyboardDidHide', invertibleProps.onKeyboardDidHide)
                this.willShowSub = Keyboard.addListener('keyboardWillShow', invertibleProps.onKeyboardWillShow);
                this.didShowSub = Keyboard.addListener('keyboardDidShow', invertibleProps.onKeyboardDidShow);
                this.willHideSub = Keyboard.addListener('keyboardWillHide', invertibleProps.onKeyboardWillHide);
                this.didHideSub = Keyboard.addListener('keyboardDidHide', invertibleProps.onKeyboardDidHide);
            }
        };
        this.detachKeyboardListeners = () => {
            var _a, _b, _c, _d;
            // const { invertibleScrollViewProps: invertibleProps } = this.props
            // Keyboard.removeListener(
            //   'keyboardWillShow',
            //   invertibleProps.onKeyboardWillShow,
            // )
            // Keyboard.removeListener(
            //   'keyboardDidShow',
            //   invertibleProps.onKeyboardDidShow,
            // )
            // Keyboard.removeListener(
            //   'keyboardWillHide',
            //   invertibleProps.onKeyboardWillHide,
            // )
            // Keyboard.removeListener(
            //   'keyboardDidHide',
            //   invertibleProps.onKeyboardDidHide,
            // )
            (_a = this.willShowSub) === null || _a === void 0 ? void 0 : _a.remove();
            (_b = this.didShowSub) === null || _b === void 0 ? void 0 : _b.remove();
            (_c = this.willHideSub) === null || _c === void 0 ? void 0 : _c.remove();
            (_d = this.didHideSub) === null || _d === void 0 ? void 0 : _d.remove();
        };
        this.renderTypingIndicator = () => {
            if (Platform.OS === 'web') {
                return null;
            }
            return <TypingIndicator isTyping={this.props.isTyping || false}/>;
        };
        this.renderFooter = () => {
            if (this.props.renderFooter) {
                return this.props.renderFooter(this.props);
            }
            return this.renderTypingIndicator();
        };
        this.renderLoadEarlier = () => {
            if (this.props.loadEarlier === true) {
                const loadEarlierProps = {
                    ...this.props,
                };
                if (this.props.renderLoadEarlier) {
                    return this.props.renderLoadEarlier(loadEarlierProps);
                }
                return <LoadEarlier {...loadEarlierProps}/>;
            }
            return null;
        };
        this.scrollToBottom = (animated = true) => {
            const { inverted } = this.props;
            if (inverted) {
                this.scrollTo({ offset: 0, animated });
            }
            else if (this._listRef) {
                this._listRef.scrollToEnd({ animated });
            }
        };
        this.handleOnScroll = (event) => {
            const { nativeEvent: { contentOffset: { y: contentOffsetY }, contentSize: { height: contentSizeHeight }, layoutMeasurement: { height: layoutMeasurementHeight }, }, } = event;
            const { scrollToBottomOffset } = this.props;
            if (this.props.inverted) {
                if (contentOffsetY > scrollToBottomOffset) {
                    this.setState({ showScrollBottom: true });
                }
                else {
                    this.setState({ showScrollBottom: false });
                }
            }
            else {
                if (contentOffsetY < scrollToBottomOffset &&
                    contentSizeHeight - layoutMeasurementHeight > scrollToBottomOffset) {
                    this.setState({ showScrollBottom: true });
                }
                else {
                    this.setState({ showScrollBottom: false });
                }
            }
        };
        this.renderRow = ({ item, index }) => {
            if (!item._id && item._id !== 0) {
                warning('GiftedChat: `_id` is missing for message', JSON.stringify(item));
            }
            if (!item.user) {
                if (!item.system) {
                    warning('GiftedChat: `user` is missing for message', JSON.stringify(item));
                }
                item.user = { _id: 0 };
            }
            const { messages, user, inverted, ...restProps } = this.props;
            if (messages && user) {
                const previousMessage = (inverted ? messages[index + 1] : messages[index - 1]) || {};
                const nextMessage = (inverted ? messages[index - 1] : messages[index + 1]) || {};
                const messageProps = {
                    ...restProps,
                    user,
                    key: item._id,
                    currentMessage: item,
                    previousMessage,
                    inverted,
                    nextMessage,
                    position: item.user._id === user._id ? 'right' : 'left',
                };
                if (this.props.renderMessage) {
                    return this.props.renderMessage(messageProps);
                }
                return <Message {...messageProps}/>;
            }
            return null;
        };
        this.renderChatEmpty = () => {
            if (this.props.renderChatEmpty) {
                return this.props.inverted ? (this.props.renderChatEmpty()) : (<View style={styles.emptyChatContainer}>
          {this.props.renderChatEmpty()}
        </View>);
            }
            return <View style={styles.container}/>;
        };
        this.renderHeaderWrapper = () => (<View style={styles.headerWrapper}>{this.renderLoadEarlier()}</View>);
        this.onLayoutList = () => {
            if (!this.props.inverted &&
                !!this.props.messages &&
                this.props.messages.length) {
                setTimeout(() => this.scrollToBottom && this.scrollToBottom(false), 15 * this.props.messages.length);
            }
            // enables onViewableItemsChanged to get called on first render
            if (this._listRef && !this._listRecorded) {
                this._listRecorded = true;
                this._listRef.recordInteraction();
            }
        };
        this.onEndReached = ({ distanceFromEnd }) => {
            const { loadEarlier, onLoadEarlier, infiniteScroll, isLoadingEarlier, } = this.props;
            if (infiniteScroll &&
                distanceFromEnd > 0 &&
                distanceFromEnd <= 100 &&
                loadEarlier &&
                onLoadEarlier &&
                !isLoadingEarlier &&
                Platform.OS !== 'web') {
                onLoadEarlier();
            }
        };
        this.keyExtractor = (item) => `${item._id}`;
        this.getListRef = this.getListRef.bind(this);
    }
    componentDidMount() {
        if (this.props.messages && this.props.messages.length === 0) {
            this.attachKeyboardListeners();
        }
    }
    componentWillUnmount() {
        this.detachKeyboardListeners();
    }
    componentDidUpdate(prevProps) {
        if (prevProps.messages &&
            prevProps.messages.length === 0 &&
            this.props.messages &&
            this.props.messages.length > 0) {
            this.detachKeyboardListeners();
        }
        else if (prevProps.messages &&
            this.props.messages &&
            prevProps.messages.length > 0 &&
            this.props.messages.length === 0) {
            this.attachKeyboardListeners();
        }
        if (this.props.extraData !== prevProps.extraData ||
            this.props.isTyping !== prevProps.isTyping) {
            this.setState({ extraData: [this.props.extraData, this.props.isTyping] });
        }
    }
    scrollTo(options) {
        if (this._listRef && options) {
            this._listRef.scrollToOffset(options);
        }
    }
    renderScrollBottomComponent() {
        const { scrollToBottomComponent } = this.props;
        if (scrollToBottomComponent) {
            return scrollToBottomComponent();
        }
        return <Text>V</Text>;
    }
    renderScrollToBottomWrapper() {
        const propsStyle = this.props.scrollToBottomStyle || {};
        return (<View style={[styles.scrollToBottomStyle, propsStyle]}>
        <TouchableOpacity onPress={() => this.scrollToBottom()} hitSlop={{ top: 5, left: 5, right: 5, bottom: 5 }}>
          {this.renderScrollBottomComponent()}
        </TouchableOpacity>
      </View>);
    }
    getListRef(flatList) {
        this._listRef = flatList;
        if (typeof this.props.forwardRef === 'function') {
            this.props.forwardRef(flatList);
        }
        else if (this.props.forwardRef) {
            this.props.forwardRef.current = flatList;
        }
    }
    render() {
        const { inverted } = this.props;
        return (<View style={this.props.alignTop ? styles.containerAlignTop : styles.container}>
        {this.state.showScrollBottom && this.props.scrollToBottom
            ? this.renderScrollToBottomWrapper()
            : null}
        <FlatList ref={this.getListRef} extraData={this.state.extraData} keyExtractor={this.keyExtractor} enableEmptySections automaticallyAdjustContentInsets={false} inverted={inverted} data={this.props.messages} style={styles.listStyle} contentContainerStyle={styles.contentContainerStyle} renderItem={this.renderRow} {...this.props.invertibleScrollViewProps} ListEmptyComponent={this.renderChatEmpty} ListFooterComponent={inverted ? this.renderHeaderWrapper : this.renderFooter} ListHeaderComponent={inverted ? this.renderFooter : this.renderHeaderWrapper} onScroll={this.handleOnScroll} scrollEventThrottle={100} onLayout={this.onLayoutList} onEndReached={this.onEndReached} onEndReachedThreshold={0.1} {...this.props.listViewProps}/>
      </View>);
    }
}
MessageContainer.defaultProps = {
    messages: [],
    user: {},
    isTyping: false,
    renderChatEmpty: null,
    renderFooter: null,
    renderMessage: null,
    onLoadEarlier: () => { },
    onQuickReply: () => { },
    inverted: true,
    loadEarlier: false,
    listViewProps: {},
    invertibleScrollViewProps: {},
    extraData: null,
    scrollToBottom: false,
    scrollToBottomOffset: 200,
    alignTop: false,
    scrollToBottomStyle: {},
    infiniteScroll: false,
    isLoadingEarlier: false,
};
MessageContainer.propTypes = {
    messages: PropTypes.arrayOf(PropTypes.object),
    isTyping: PropTypes.bool,
    user: PropTypes.object,
    renderChatEmpty: PropTypes.func,
    renderFooter: PropTypes.func,
    renderMessage: PropTypes.func,
    renderLoadEarlier: PropTypes.func,
    onLoadEarlier: PropTypes.func,
    listViewProps: PropTypes.object,
    inverted: PropTypes.bool,
    loadEarlier: PropTypes.bool,
    invertibleScrollViewProps: PropTypes.object,
    extraData: PropTypes.array,
    scrollToBottom: PropTypes.bool,
    scrollToBottomOffset: PropTypes.number,
    scrollToBottomComponent: PropTypes.func,
    alignTop: PropTypes.bool,
    scrollToBottomStyle: StylePropType,
    infiniteScroll: PropTypes.bool,
};
//# sourceMappingURL=MessageContainer.js.map
import { EmitterSubscription, FlatList, ListRenderItemInfo, ListViewProps, NativeScrollEvent, NativeSyntheticEvent, StyleProp, ViewStyle } from 'react-native';
import { IMessage, Reply, User } from './Models';
import React, { MutableRefObject } from 'react';
import LoadEarlier from './LoadEarlier';
import Message from './Message';
import PropTypes from 'prop-types';
export interface MessageContainerProps<TMessage extends IMessage> {
    messages?: TMessage[];
    isTyping?: boolean;
    user?: User;
    listViewProps: Partial<ListViewProps>;
    inverted?: boolean;
    fakeInverted?: boolean;
    loadEarlier?: boolean;
    alignTop?: boolean;
    scrollToBottom?: boolean;
    scrollToBottomStyle?: StyleProp<ViewStyle>;
    invertibleScrollViewProps?: any;
    extraData?: any;
    scrollToBottomOffset?: number;
    forwardRef?: ((flatList: FlatList<TMessage> | null) => void) | MutableRefObject<FlatList<TMessage> | null | undefined>;
    renderChatEmpty?(): React.ReactNode;
    renderFooter?(props: MessageContainerProps<TMessage>): React.ReactNode;
    renderMessage?(props: Message['props']): React.ReactNode;
    renderLoadEarlier?(props: LoadEarlier['props']): React.ReactNode;
    scrollToBottomComponent?(): React.ReactNode;
    onLoadEarlier?(): void;
    onQuickReply?(replies: Reply[]): void;
    infiniteScroll?: boolean;
    isLoadingEarlier?: boolean;
}
interface State {
    showScrollBottom: boolean;
    extraData?: any;
}
export default class MessageContainer<TMessage extends IMessage = IMessage> extends React.PureComponent<MessageContainerProps<TMessage>, State> {
    static defaultProps: {
        messages: never[];
        user: {};
        isTyping: boolean;
        renderChatEmpty: null;
        renderFooter: null;
        renderMessage: null;
        onLoadEarlier: () => void;
        onQuickReply: () => void;
        inverted: boolean;
        loadEarlier: boolean;
        listViewProps: {};
        invertibleScrollViewProps: {};
        extraData: null;
        scrollToBottom: boolean;
        scrollToBottomOffset: number;
        alignTop: boolean;
        scrollToBottomStyle: {};
        infiniteScroll: boolean;
        isLoadingEarlier: boolean;
    };
    static propTypes: {
        messages: PropTypes.Requireable<(object | null | undefined)[]>;
        isTyping: PropTypes.Requireable<boolean>;
        user: PropTypes.Requireable<object>;
        renderChatEmpty: PropTypes.Requireable<(...args: any[]) => any>;
        renderFooter: PropTypes.Requireable<(...args: any[]) => any>;
        renderMessage: PropTypes.Requireable<(...args: any[]) => any>;
        renderLoadEarlier: PropTypes.Requireable<(...args: any[]) => any>;
        onLoadEarlier: PropTypes.Requireable<(...args: any[]) => any>;
        listViewProps: PropTypes.Requireable<object>;
        inverted: PropTypes.Requireable<boolean>;
        loadEarlier: PropTypes.Requireable<boolean>;
        invertibleScrollViewProps: PropTypes.Requireable<object>;
        extraData: PropTypes.Requireable<any[]>;
        scrollToBottom: PropTypes.Requireable<boolean>;
        scrollToBottomOffset: PropTypes.Requireable<number>;
        scrollToBottomComponent: PropTypes.Requireable<(...args: any[]) => any>;
        alignTop: PropTypes.Requireable<boolean>;
        scrollToBottomStyle: PropTypes.Requireable<number | boolean | object>;
        infiniteScroll: PropTypes.Requireable<boolean>;
    };
    _listRef: FlatList<TMessage> | null | undefined;
    _listRecorded: boolean;
    state: {
        showScrollBottom: boolean;
        extraData: any[];
    };
    willShowSub: EmitterSubscription | undefined;
    didShowSub: EmitterSubscription | undefined;
    willHideSub: EmitterSubscription | undefined;
    didHideSub: EmitterSubscription | undefined;
    constructor(props: MessageContainerProps<TMessage>);
    componentDidMount(): void;
    componentWillUnmount(): void;
    componentDidUpdate(prevProps: MessageContainerProps<TMessage>): void;
    attachKeyboardListeners: () => void;
    detachKeyboardListeners: () => void;
    renderTypingIndicator: () => JSX.Element | null;
    renderFooter: () => {} | null | undefined;
    renderLoadEarlier: () => {} | null | undefined;
    scrollTo(options: {
        animated?: boolean;
        offset: number;
    }): void;
    scrollToBottom: (animated?: boolean) => void;
    handleOnScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
    renderRow: ({ item, index }: ListRenderItemInfo<TMessage>) => JSX.Element | null;
    renderChatEmpty: () => {} | null | undefined;
    renderHeaderWrapper: () => JSX.Element;
    renderScrollBottomComponent(): {} | null | undefined;
    renderScrollToBottomWrapper(): JSX.Element;
    onLayoutList: () => void;
    onEndReached: ({ distanceFromEnd }: {
        distanceFromEnd: number;
    }) => void;
    getListRef(flatList: FlatList<TMessage> | null): void;
    keyExtractor: (item: TMessage) => string;
    render(): JSX.Element;
}
export {};

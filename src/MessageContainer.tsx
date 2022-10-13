import {
  EmitterSubscription,
  FlatList,
  Keyboard,
  ListRenderItemInfo,
  ListViewProps,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native'
import { IMessage, Reply, User } from './Models'
import React, { MutableRefObject } from 'react'
import { StylePropType, warning } from './utils'

import Color from './Color'
import LoadEarlier from './LoadEarlier'
import Message from './Message'
import PropTypes from 'prop-types'
import TypingIndicator from './TypingIndicator'

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
  },
  headerWrapper: {
    flex: 1,
  },
  fakeInvertContainer: {
    flexGrow: 1,
    flexShrink: 0,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  listStyle: {
    flex: 1,
  },
  fakeInvertListStyle: {
    flex: 1,
    width: '100%',
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
  scrollToBottomFakeInvertStyle: {
    left: 10,
    right: undefined,
    top: 30,
    bottom: undefined,
  },
  fakeInvert: {
    transform: [{ rotate: '180deg' }],
  },
})

export interface MessageContainerProps<TMessage extends IMessage> {
  messages?: TMessage[]
  isTyping?: boolean
  user?: User
  listViewProps: Partial<ListViewProps>
  inverted?: boolean
  fakeInverted?: boolean
  loadEarlier?: boolean
  alignTop?: boolean
  scrollToBottom?: boolean
  scrollToBottomStyle?: StyleProp<ViewStyle>
  invertibleScrollViewProps?: any
  extraData?: any
  scrollToBottomOffset?: number
  forwardRef?:
    | ((flatList: FlatList<TMessage> | null) => void)
    | MutableRefObject<FlatList<TMessage> | null | undefined>
  renderChatEmpty?(): React.ReactNode
  renderFooter?(props: MessageContainerProps<TMessage>): React.ReactNode
  renderMessage?(props: Message['props']): React.ReactNode
  renderLoadEarlier?(props: LoadEarlier['props']): React.ReactNode
  scrollToBottomComponent?(): React.ReactNode
  onLoadEarlier?(): void
  onQuickReply?(replies: Reply[]): void
  infiniteScroll?: boolean
  isLoadingEarlier?: boolean
}

interface State {
  showScrollBottom: boolean
  extraData?: any
}

export default class MessageContainer<
  TMessage extends IMessage = IMessage
> extends React.PureComponent<MessageContainerProps<TMessage>, State> {
  static defaultProps = {
    messages: [],
    user: {},
    isTyping: false,
    renderChatEmpty: null,
    renderFooter: null,
    renderMessage: null,
    onLoadEarlier: () => {},
    onQuickReply: () => {},
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
  }

  static propTypes = {
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
  }

  _listRef: FlatList<TMessage> | null | undefined = undefined
  _listRecorded: boolean = false

  state = {
    showScrollBottom: false,
    extraData: [this.props.extraData, this.props.isTyping],
  }
  willShowSub: EmitterSubscription | undefined
  didShowSub: EmitterSubscription | undefined
  willHideSub: EmitterSubscription | undefined
  didHideSub: EmitterSubscription | undefined

  constructor(props: MessageContainerProps<TMessage>) {
    super(props)
    this.getListRef = this.getListRef.bind(this)
  }

  componentDidMount() {
    if (this.props.messages && this.props.messages.length === 0) {
      this.attachKeyboardListeners()
    }
  }

  componentWillUnmount() {
    this.detachKeyboardListeners()
  }

  componentDidUpdate(prevProps: MessageContainerProps<TMessage>) {
    if (
      prevProps.messages &&
      prevProps.messages.length === 0 &&
      this.props.messages &&
      this.props.messages.length > 0
    ) {
      this.detachKeyboardListeners()
    } else if (
      prevProps.messages &&
      this.props.messages &&
      prevProps.messages.length > 0 &&
      this.props.messages.length === 0
    ) {
      this.attachKeyboardListeners()
    }
    const extraDataChange =
      this.props.extraData !== prevProps.extraData ||
      this.props.isTyping !== prevProps.isTyping
    if (extraDataChange) {
      this.setState(({ extraData }) => ({
        extraData: extraDataChange
          ? [this.props.extraData, this.props.isTyping]
          : extraData,
      }))
    }
  }

  // 0.16.3-patch: https://github.com/FaridSafi/react-native-gifted-chat/issues/2112#issue-1000416894
  attachKeyboardListeners = () => {
    const { invertibleScrollViewProps: invertibleProps } = this.props
    if (invertibleProps) {
      this.detachKeyboardListeners()
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
      this.willShowSub = Keyboard.addListener(
        'keyboardWillShow',
        invertibleProps.onKeyboardWillShow,
      )
      this.didShowSub = Keyboard.addListener(
        'keyboardDidShow',
        invertibleProps.onKeyboardDidShow,
      )
      this.willHideSub = Keyboard.addListener(
        'keyboardWillHide',
        invertibleProps.onKeyboardWillHide,
      )
      this.didHideSub = Keyboard.addListener(
        'keyboardDidHide',
        invertibleProps.onKeyboardDidHide,
      )
    }
  }

  detachKeyboardListeners = () => {
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
    this.willShowSub?.remove()
    this.didShowSub?.remove()
    this.willHideSub?.remove()
    this.didHideSub?.remove()
  }

  renderTypingIndicator = () => {
    if (Platform.OS === 'web') {
      return null
    }
    return <TypingIndicator isTyping={this.props.isTyping || false} />
  }

  renderFooter = () => {
    if (this.props.renderFooter) {
      return this.props.renderFooter(this.props)
    }

    return this.renderTypingIndicator()
  }

  renderLoadEarlier = () => {
    if (this.props.loadEarlier === true) {
      const loadEarlierProps = {
        ...this.props,
      }
      if (this.props.renderLoadEarlier) {
        return this.props.renderLoadEarlier(loadEarlierProps)
      }
      return <LoadEarlier {...loadEarlierProps} />
    }
    return null
  }

  scrollTo(options: { animated?: boolean; offset: number }) {
    if (this._listRef && options) {
      this._listRef.scrollToOffset(options)
    }
  }

  scrollToBottom = (animated: boolean = true) => {
    const { inverted, fakeInverted } = this.props
    if (inverted || fakeInverted) {
      this.scrollTo({ offset: 0, animated })
    } else if (this._listRef) {
      this._listRef!.scrollToEnd({ animated })
    }
  }

  handleOnScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const {
      nativeEvent: {
        contentOffset: { y: contentOffsetY },
        contentSize: { height: contentSizeHeight },
        layoutMeasurement: { height: layoutMeasurementHeight },
      },
    } = event
    const { scrollToBottomOffset, inverted, fakeInverted } = this.props
    if (inverted || fakeInverted) {
      if (contentOffsetY > scrollToBottomOffset!) {
        this.setState({ showScrollBottom: true })
      } else {
        this.setState({ showScrollBottom: false })
      }
    } else {
      if (
        contentOffsetY < scrollToBottomOffset! &&
        contentSizeHeight - layoutMeasurementHeight > scrollToBottomOffset!
      ) {
        this.setState({ showScrollBottom: true })
      } else {
        this.setState({ showScrollBottom: false })
      }
    }
  }

  renderRow = ({ item, index }: ListRenderItemInfo<TMessage>) => {
    if (!item._id && item._id !== 0) {
      warning('GiftedChat: `_id` is missing for message', JSON.stringify(item))
    }
    if (!item.user) {
      if (!item.system) {
        warning(
          'GiftedChat: `user` is missing for message',
          JSON.stringify(item),
        )
      }
      item.user = { _id: 0 }
    }
    const { messages, user, inverted, fakeInverted, ...restProps } = this.props
    if (messages && user) {
      const previousMessage =
        (inverted || fakeInverted
          ? messages[index + 1]
          : messages[index - 1]) || {}
      const nextMessage =
        (inverted || fakeInverted
          ? messages[index - 1]
          : messages[index + 1]) || {}

      const messageProps: Message['props'] = {
        ...restProps,
        user,
        key: item._id,
        currentMessage: item,
        previousMessage,
        inverted,
        nextMessage,
        position: item.user._id === user._id ? 'right' : 'left',
      }

      if (this.props.renderMessage) {
        return (
          <View style={this.props.fakeInverted && styles.fakeInvert}>
            {this.props.renderMessage(messageProps)}
          </View>
        )
      }
      return (
        <View style={this.props.fakeInverted && styles.fakeInvert}>
          <Message {...messageProps} />
        </View>
      )
    }
    return null
  }

  renderChatEmpty = () => {
    if (this.props.renderChatEmpty) {
      const empty = this.props.renderChatEmpty()
      return this.props.inverted ? (
        empty
      ) : (
        <View
          style={[
            styles.emptyChatContainer,
            this.props.fakeInverted && styles.fakeInvert,
          ]}
        >
          {empty}
        </View>
      )
    }
    return <View style={styles.container} />
  }

  renderHeaderWrapper = () => (
    <View
      style={[
        styles.headerWrapper,
        this.props.fakeInverted && styles.fakeInvert,
      ]}
    >
      {this.renderLoadEarlier()}
    </View>
  )

  renderScrollBottomComponent() {
    const { scrollToBottomComponent } = this.props

    if (scrollToBottomComponent) {
      return scrollToBottomComponent()
    }

    return <Text>V</Text>
  }

  renderScrollToBottomWrapper() {
    const propsStyle = this.props.scrollToBottomStyle || {}
    return (
      <View
        style={[
          styles.scrollToBottomStyle,
          this.props.fakeInverted && styles.fakeInvert,
          this.props.fakeInverted && styles.scrollToBottomFakeInvertStyle,
          propsStyle,
        ]}
      >
        <TouchableOpacity
          onPress={() => this.scrollToBottom()}
          hitSlop={{ top: 5, left: 5, right: 5, bottom: 5 }}
        >
          {this.renderScrollBottomComponent()}
        </TouchableOpacity>
      </View>
    )
  }

  onLayoutList = () => {
    if (
      !this.props.inverted &&
      !this.props.fakeInverted &&
      !!this.props.messages &&
      this.props.messages!.length
    ) {
      setTimeout(
        () => this.scrollToBottom && this.scrollToBottom(false),
        15 * this.props.messages!.length,
      )
    }

    // enables onViewableItemsChanged to get called on first render
    if (this._listRef && !this._listRecorded) {
      this._listRecorded = true
      this._listRef.recordInteraction()
    }
  }

  onEndReached = ({ distanceFromEnd }: { distanceFromEnd: number }) => {
    const {
      loadEarlier,
      onLoadEarlier,
      infiniteScroll,
      isLoadingEarlier,
    } = this.props
    if (
      infiniteScroll &&
      distanceFromEnd > 0 &&
      distanceFromEnd <= 100 &&
      loadEarlier &&
      onLoadEarlier &&
      !isLoadingEarlier &&
      Platform.OS !== 'web'
    ) {
      onLoadEarlier()
    }
  }

  getListRef(flatList: FlatList<TMessage> | null) {
    this._listRef = flatList
    if (typeof this.props.forwardRef === 'function') {
      this.props.forwardRef(flatList)
    } else if (this.props.forwardRef) {
      this.props.forwardRef.current = flatList
    }
  }

  keyExtractor = (item: TMessage) => `${item._id}`

  render() {
    const { messages, inverted, fakeInverted } = this.props
    const { style, ...listViewProps } = this.props.listViewProps
    const {
      inverted: removeInverted,
      ...invertibleScrollViewProps
    } = this.props.invertibleScrollViewProps
    return (
      <View
        style={
          fakeInverted
            ? styles.fakeInvertContainer
            : this.props.alignTop
            ? styles.containerAlignTop
            : styles.container
        }
      >
        {this.state.showScrollBottom && this.props.scrollToBottom
          ? this.renderScrollToBottomWrapper()
          : null}
        <FlatList
          ref={this.getListRef}
          extraData={this.state.extraData}
          keyExtractor={this.keyExtractor}
          enableEmptySections
          automaticallyAdjustContentInsets={false}
          inverted={inverted}
          data={messages}
          style={[
            fakeInverted ? styles.fakeInvertListStyle : styles.listStyle,
            style,
          ]}
          contentContainerStyle={styles.contentContainerStyle}
          renderItem={this.renderRow}
          {...invertibleScrollViewProps}
          ListEmptyComponent={this.renderChatEmpty}
          ListFooterComponent={
            inverted || fakeInverted
              ? this.renderHeaderWrapper
              : this.renderFooter
          }
          ListHeaderComponent={
            inverted || fakeInverted
              ? this.renderFooter
              : this.renderHeaderWrapper
          }
          onScroll={this.handleOnScroll}
          scrollEventThrottle={100}
          onLayout={this.onLayoutList}
          onEndReached={this.onEndReached}
          onEndReachedThreshold={0.1}
          {...listViewProps}
        />
      </View>
    )
  }
}

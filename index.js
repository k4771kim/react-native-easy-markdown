import React, { Component } from 'react'
import PropTypes from 'prop-types'
import {
  TouchableOpacity,
  Text,
  View,
  Image,
  Linking,
  StyleSheet,
  Dimensions
} from 'react-native'

const { width } = Dimensions.get('window')
import SimpleMarkdown from 'simple-markdown'
import screenID from '../../src/constants/screenID'
import styles from './styles'
import Utils from './Utils'
import EliceText from '../../src/components/blocks/eliceComponent/eliceText'
import {push} from '../../src/libs/navigatorUtils'
import {ScreenID} from '../../src/constants'
import Intercom from 'react-native-intercom'
import { ScrollView } from 'react-native-gesture-handler'
class Markdown extends Component {
  static propTypes = {
    debug: PropTypes.bool,
    parseInline: PropTypes.bool,
    markdownStyles: PropTypes.object,
    useDefaultStyles: PropTypes.bool,
    renderImage: PropTypes.func,
    renderLink: PropTypes.func,
    renderListBullet: PropTypes.func
  }

  static defaultProps = {
    debug: false,
    useDefaultStyles: true,
    parseInline: false,
    markdownStyles: {}
  }

  constructor (props) {
    super(props)

    const rules = SimpleMarkdown.defaultRules
    this.parser = SimpleMarkdown.parserFor(rules)
    this.reactOutput = SimpleMarkdown.reactFor(
      SimpleMarkdown.ruleOutput(rules, 'react')
    )
    const blockSource = this.props.children + '\n\n'
    const parseTree = this.parser(blockSource, {
      inline: this.props.parseInline
    })
    const outputResult = this.reactOutput(parseTree)

    const defaultStyles = this.props.useDefaultStyles && styles ? styles : {}
    const _styles = StyleSheet.create(
      Object.assign(defaultStyles, this.props.markdownStyles)
    )

    this.state = {
      syntaxTree: outputResult,
      styles: _styles
    }
  }

  componentWillReceiveProps (nextProps) {
    let newState = {}

    if (nextProps.children !== this.props.children) {
      const blockSource = nextProps.children + '\n\n'
      const parseTree = this.parser(blockSource, {
        inline: this.props.parseInline
      })
      const outputResult = this.reactOutput(parseTree)

      newState.syntaxTree = outputResult
    }

    if (nextProps.markdownStyles !== this.props.markdownStyles) {
      const defaultStyles = this.props.useDefaultStyles && styles ? styles : {}
      newState.styles = StyleSheet.create(
        Object.assign(defaultStyles, nextProps.markdownStyles)
      )
    }

    if (Object.keys(newState).length !== 0) {
      this.setState(newState)
    }
  }

  shouldComponentUpdate (nextProps) {
    return (
      this.props.children !== nextProps.children ||
      this.props.markdownStyles !== nextProps.markdownStyles
    )
  }

  renderImage (node, key) {
    const { styles } = this.state

    if (this.props.renderImage) {
      return this.props.renderImage(
        node.props.src,
        node.props.alt,
        node.props.title
      )
    }

    return (
      <View style={styles.imageWrapper} key={'imageWrapper_' + key}>
        <Image
          source={{ uri: node.props.src }}
          resizeMode='contain'
          style={styles.image}
        />
      </View>
    )
  }

  renderLine (node, key) {
    const { styles } = this.state

    return <View style={styles.hr} key={'hr_' + key} />
  }

  renderList (node, key, ordered) {
    const { styles } = this.state

    return (
      <View key={'list_' + key} style={styles.list}>

        {this.renderNodes(node.props.children, key, { ordered })}
      </View>
    )
  }

  renderListBullet (ordered, index) {
    const { styles } = this.state

    if (ordered) {
      return (
        <Text key={'listBullet_' + index} style={styles.listItemNumber}>
          {index + 1 + '.'}
        </Text>
      )
    }

    return <View key={'listBullet_' + index} style={styles.listItemBullet} />
  }

  renderListItem (node, key, index, extras) {
    const { styles } = this.state

    let children = this.renderNodes(node.props.children, key, extras)

    return (
      <View
        style={[styles.listItem, { flexDirection: 'row' }]}
        key={'listItem_' + key}
      >

        {this.props.renderListBullet
          ? this.props.renderListBullet(extras.ordered, index)
          : this.renderListBullet(extras.ordered, index)}
        <View key={'listItemContent_' + key} style={styles.listItemContent}>
          {children}
        </View>
      </View>
    )
  }

  renderText (node, key, extras) {
    const { styles } = this.state

    let style = extras && extras.style
      ? [styles.text].concat(extras.style)
      : styles.text

    if (node.props) {
      return (
        <View style={{}} key={key}>
          {/* style={style} */}
          {this.renderNodes(node.props.children, key, extras)}
        </View>
      )
    } else {
      return <Text key={key} style={style}>{node}</Text>
      // if (typeof node === 'string') {
      //   return <Text key={key} style={style}>{node}</Text>
      // } else {
      //   return <View key={key} style={style}>{node}</View>
      // }
    }
  }

  renderHtmlTagLink (node, key, extras) {
    const { styles } = this.state

    let style = extras && extras.style
      ? [styles.text].concat(extras.style)
      : styles.text

    if (node.props) {
      let content = node.props.children[0]
      let type = node.props.type

      if ((type = '"<a class="intercom-launcher">')) {
        let children = this.renderNodes(node.props.children, key, extras)

        return (
          <TouchableOpacity
            style={[styles.linkWrapper]}
            key={'linkWrapper_' + key}
            onPress={() => {
              Intercom.displayMessageComposer()
            }}
          >
            {children}
          </TouchableOpacity>
        )
      } else {
        return <Text key={key} style={style}>{content}</Text>
      }
    }
  }

  renderLink (node, key) {
    const { styles } = this.state
    let extras = Utils.concatStyles(null, styles.link)
    let children = this.renderNodes(node.props.children, key, extras)

    if (this.props.renderLink) {
      return this.props.renderLink(node.props.href, node.props.title, children)
    }
    return (
      <TouchableOpacity
        style={[styles.linkWrapper]}
        key={'linkWrapper_' + key}
        onPress={() => {
          this.props.handleLink(node.props.href, 'Elice')
        }}
      >
        {children}
      </TouchableOpacity>
    )
  }

  renderBlockQuote (node, key, extras) {
    extras = extras
      ? Object.assign(extras, { blockQuote: true })
      : { blockQuote: true }
    return this.renderBlock(node, key, extras)
  }
  renderFence (node, key, extras) {
    const { styles } = this.state
    let style = [styles.blockItem]
    let isBlockQuote
    if (extras && extras.blockQuote) {
      isBlockQuote = true

      /* Ensure that blockQuote style is applied only once, and not for
             * all nested components as well (unless there is a nested blockQuote)
             */
      delete extras.blockQuote
    }

    console.log(node)


    
    const nodes =  this.renderNodes(node.props.children, key, extras)
    // if (isBlockQuote) {
    //   style.push(styles.fenceQuote)
    //   return (
    //     <View style={{ flexDirection: 'column', width }}>
    //       <View
    //         key={'blockQuote_' + key}
    //         style={[styles.fence, { flexDirection: 'column' }]}
    //       >
    //         <Text style={{ color: '#eeeeee' }}>
    //           {node.props.children[0].props.children[0]}
    //         </Text>
    //       </View>
    //     </View>
    //   )
    // } else {
    return (
      <View
        style={{
          width: '100%'
        }}
      >
        <View
          key={'block_' + key}
          style={[
            styles.fence,
            {
              overflow: 'hidden',
              backgroundColor: '#444444',
              width: '100%',
              padding: 30
            }
          ]}
        >

          {nodes}

        </View>
      </View>
    )
    // }
  }
  renderBlock (node, key, extras) {
    const { styles } = this.state

    let style = [styles.block]
    let isBlockQuote
    if (extras && extras.blockQuote) {
      isBlockQuote = true

      /* Ensure that blockQuote style is applied only once, and not for
             * all nested components as well (unless there is a nested blockQuote)
             */
      delete extras.blockQuote
    }
    const nodes = this.renderNodes(node.props.children, key, extras)

    if (isBlockQuote) {
      style.push(styles.blockQuote)
      return (
        <View
          key={'blockQuote_' + key}
          style={[styles.block, styles.blockQuote, {}]}
        >
          {typeof nodes === 'string'
            ? <Text
              style={{
                color: '#dddddd'
              }}
              >
              {nodes}
            </Text>
            : <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                alignSelf: 'center'
              }}
              >
              {nodes}
            </View>}

        </View>
      )
    } else {
      return (
        <View key={'block_' + key} style={[styles.block, {}]}>
          {nodes}
        </View>
      )
    }
  }
  renderTable (node, key) {
    return (
      <ScrollView horizontal style={{ marginBottom: 32, flex: 1 }}>
        <View style={{ flex: 1 }}>
          {this.renderNodes(node.props.children, key)}
        </View>
      </ScrollView>
    )
  }
  renderTHead (node, key) {
    return (
      <View style={{ flex: 1, borderBottomWidth: 1, borderColor: '#DDDDDD' }}>

        {this.renderNodes(node.props.children, key)}

      </View>
    )
  }
  renderTBody (node, key, index) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#FBFBFB'
        }}
      >

        {this.renderNodes(node.props.children, key)}

      </View>
    )
  }

  renderTH (node, key, extras) {
    return (
      <View style={{ flex: 1 }}>
        {this.renderNodes(node.props.children, key, extras)}
      </View>
    )
  }
  renderTR (node, key, extras, index) {
    return (
      <View
        style={{
          flexDirection: 'row',
          borderBottomWidth: 1,
          flex: 1,
          borderColor: '#DDDDDD',
          backgroundColor: index % 2 === 0 ? '#FBFBFB' : 'white'
        }}
      >
        {this.renderNodes(node.props.children, key, extras)}
      </View>
    )
  }
  renderTD (node, key, extras) {
    return (
      <View
        style={{
          flex: 1
        }}
      >
        {this.renderNodes(node.props.children, key, extras)}
      </View>
    )
  }
  renderNode (node, key, index, extras) {
    if (node == null || node == 'null' || node == 'undefined' || node == '') {
      return null
    }

    const { styles } = this.state

    switch (node.type) {
      case 'h1':
        return (
          <View style={{ width: '100%' }}>
            {this.renderText(node, key, Utils.concatStyles(extras, styles.h1))}
          </View>
        )
      case 'h2':
        return (
          <View style={{ width: '100%' }}>
            {this.renderText(node, key, Utils.concatStyles(extras, styles.h2))}
          </View>
        )
      case 'h3':
        return (
          <View style={{ width: '100%' }}>
            {this.renderText(node, key, Utils.concatStyles(extras, styles.h3))}
          </View>
        )
      case 'h4':
        return (
          <View style={{ width: '100%' }}>
            {this.renderText(node, key, Utils.concatStyles(extras, styles.h4))}
          </View>
        )
      case 'h5':
        return (
          <View style={{ width: '100%' }}>
            {this.renderText(node, key, Utils.concatStyles(extras, styles.h5))}
          </View>
        )
      case 'h6':
        return (
          <View style={{ width: '100%' }}>
            {this.renderText(node, key, Utils.concatStyles(extras, styles.h6))}
          </View>
        )
      case 'htmlTagLink':
        return this.renderHtmlTagLink(
          node,
          key,
          Utils.concatStyles(extras, styles.htmlTagLink)
        )
      case 'blockItem':
        return this.renderText(
          node,
          key,
          Utils.concatStyles(extras, styles.blockItem)
        )

      case 'fence':
        return this.renderFence(
          node,
          key,
          Utils.concatStyles(extras, styles.fence)
        )

      case 'hr':
        return this.renderLine(node, key)
      case 'div':
        return this.renderBlock(node, key, extras)
      case 'ul':
        return this.renderList(node, key, false)
      case 'ol':
        return this.renderList(node, key, true)
      case 'li':
        return this.renderListItem(node, key, index, extras)
      case 'a':
        return this.renderLink(node, key)
      case 'img':
        return this.renderImage(node, key)
      case 'strong':
        return this.renderText(
          node,
          key,
          Utils.concatStyles(extras, styles.strong)
        )
      case 'del':
        return this.renderText(
          node,
          key,
          Utils.concatStyles(extras, styles.del)
        )
      case 'em':
        return this.renderText(node, key, Utils.concatStyles(extras, styles.em))
      case 'u':
        return this.renderText(node, key, Utils.concatStyles(extras, styles.u))
      case 'blockquote':
        return this.renderBlockQuote(node, key)
      case 'table':
        return this.renderTable(node, key)
      case 'thead':
        return this.renderTHead(node, key)
      case 'tbody':
        return this.renderTBody(node, key, index)
      case 'th':
        return this.renderTH(
          node,
          key,
          Utils.concatStyles(extras, styles.th),
          index
        )
      case 'tr':
        return this.renderTR(
          node,
          key,
          Utils.concatStyles(extras, styles.tr),
          index
        )

      case 'td':
        return this.renderTD(
          node,
          key,
          Utils.concatStyles(extras, styles.td),
          index
        )

      case undefined:
        return this.renderText(node, key, extras)

      default:
        if (this.props.debug) {
          console.log('Node type ' + node.type + ' is not supported')
        }
        return null
    }
  }

  renderNodes (nodes, key, extras) {
    return nodes.map((node, index) => {
      const newKey = key ? key + '_' + index : index + ''
      return this.renderNode(node, newKey, index, extras)
    })
  }

  render () {
    let content = this.renderNodes(this.state.syntaxTree, null, null)

    if (this.props.debug) {
      console.log('\n\n==== LOGGING NODE TREE ===')
      Utils.logDebug(content)
    }

    return (
      <View {...this.props}>
        {content}
      </View>
    )
  }
}

export default Markdown

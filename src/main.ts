import { argv, stdin } from 'process'
import { readFileSync, writeFileSync } from 'fs'
import { nanoid } from 'nanoid'
import treeify, { TreeObject } from 'treeify'
import readline from 'readline'
import { flattenDeep } from 'lodash'
import { basename } from 'path'

const rl = readline.createInterface({
  input: stdin,
})

function pause() {
  return new Promise<void>((resolve) => {
    rl.once('line', (line) => {
      resolve()
    })
  })
}

function log(texts: any, needPause = false) {
  console.log(texts)
  return needPause ? pause() : undefined
}

;(async () => {
  log('哈夫曼编码介绍\n\n')

  log('示例输入文本')
  // const filePath = argv.pop() || ''
  const filePath = 'src/assets/texts/NinePointEight.txt'

  const fileContent = readFileSync(filePath, {
    encoding: 'utf8',
  })

  log(fileContent)

  log('统计一下各个字符的数量')

  const dictionary = new Map()

  const letters = fileContent.split('')
  letters.forEach((letter) => {
    const letterCount = dictionary.get(letter)
    if (!letterCount) {
      dictionary.set(letter, 1)
    } else {
      dictionary.set(letter, letterCount + 1)
    }
  })

  log(dictionary)

  interface TreeNode {
    count: number
    id: string
    letter?: string
    0?: string
    1?: string
    parent?: string
  }

  const treeNodes: TreeNode[] = []
  dictionary.forEach((letterCount, letter) => {
    treeNodes.splice(
      0,
      Infinity,
      ...insertToSortedTreeNodes(
        { id: nanoid(), count: letterCount, letter },
        treeNodes
      )
    )
  })

  function insertToSortedTreeNodes(
    treeNode: TreeNode,
    insertedArray: TreeNode[]
  ): TreeNode[] {
    if (insertedArray.length === 0) return [treeNode]
    const firstNode = insertedArray[0]
    return treeNode.count > firstNode.count
      ? [
          firstNode,
          ...insertToSortedTreeNodes(treeNode, insertedArray.slice(1)),
        ]
      : [treeNode, ...insertedArray]
  }

  log('对所有字符排序, 按出现的次数')

  log(treeNodes)

  const treeNodesDictionary = new Map<string, TreeNode>()

  function buildHuffmanTree(sortedTreeNodes: TreeNode[]) {
    if (sortedTreeNodes.length === 1) return
    const [leftNode, rightNode] = sortedTreeNodes.splice(0, 2)
    const selfId = nanoid()
    const selfNode = {
      id: selfId,
      count: leftNode.count + rightNode.count,
      0: leftNode.id,
      1: rightNode.id,
    }
    treeNodesDictionary.set(leftNode.id, { ...leftNode, parent: selfId })
    treeNodesDictionary.set(rightNode.id, { ...rightNode, parent: selfId })
    treeNodesDictionary.set(selfId, selfNode)
    const newSortedTreeNodes = insertToSortedTreeNodes(
      selfNode,
      sortedTreeNodes
    )
    buildHuffmanTree(newSortedTreeNodes)
  }

  buildHuffmanTree([...treeNodes])

  log('构建好哈夫曼树')
  log(treeNodesDictionary)

  let rootNode!: TreeNode
  for (const iterator of treeNodesDictionary.entries()) {
    const [_, node] = iterator
    if (!node.parent) {
      rootNode = node
      break
    }
  }

  interface PrintableTreeNode {
    count: number
    0?: PrintableTreeNode | PrintableTreeLeaf
    1?: PrintableTreeNode | PrintableTreeLeaf
  }

  interface PrintableTreeLeaf {
    letter: string
    path: string
  }

  const letterPathMap = new Map()

  const printableTreeRoot = {
    count: rootNode.count,
    0: printHuffmanTree({ id: rootNode?.[0], path: '0' }),
    1: printHuffmanTree({ id: rootNode?.[1], path: '1' }),
  }

  function printHuffmanTree({
    id,
    path,
  }: {
    id?: string
    path: string
  }): PrintableTreeNode | PrintableTreeLeaf | undefined {
    if (!id) return
    const node = treeNodesDictionary.get(id)
    if (node?.letter) {
      letterPathMap.set(node.letter, path)
      return { letter: node.letter, path }
    }
    return {
      count: node?.count || 0,
      0: printHuffmanTree({ id: node?.[0], path: path + '0' }),
      1: printHuffmanTree({ id: node?.[1], path: path + '1' }),
    }
  }

  log('可视化输出构建的树')
  log(treeify.asTree(printableTreeRoot as unknown as TreeObject, true, true))

  log('得到一张字符与二进制码的映射表')
  log(letterPathMap)

  const compressed = letters
    .map((letter) => {
      return letterPathMap.get(letter)
    })
    .join('')

  const uint8Src = []
  for (let index = 0; index < compressed.length; index += 8) {
    let unint8Str = compressed.slice(index, index + 8)

    while (unint8Str.length < 8) {
      unint8Str += '0'
    }
    uint8Src.push(parseInt(unint8Str, 2))
  }

  writeFileSync(
    `src/assets/texts/${basename(filePath, '.txt')}(compressed).txt`,
    compressed,
    {
      encoding: 'utf8',
    }
  )
  writeFileSync(
    `src/assets/texts/${basename(filePath, '.txt')}(binary).txt`,
    Uint8Array.from(uint8Src),
    {
      encoding: 'binary',
    }
  )

  process.exit()
})()

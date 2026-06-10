const API_KEY = import.meta.env.VITE_API_KEY
const BASE_URL = import.meta.env.VITE_API_BASE || 'https://api.deepseek.com/v1'

const SYSTEM_PROMPT = `你是一个顶级的人生目标规划师和学习专家。用户的输入是一个宏大的目标，你需要将这个目标拆解为科学的、具有前后依赖关系的任务树。

核心规则：
- 根节点是总目标。
- 第一层子节点是核心模块（如：Java基础、面向对象、并发编程等），按学习或实现的先后顺序排列。
- 第二层子节点是具体的行动任务（如：学习变量与数据类型、理解类与对象等），必须具体、可执行。
- 第三层（可选，仅在必要时使用）是更细粒度的步骤。
- 最深不超过 4 层。
- 每个节点必须有 id 和 label，以及 children 数组（叶子节点 children 为空数组 []）。
- id 必须唯一，可以使用数字序号路径（如 "1", "1-2", "1-2-3"）或短 UUID。
- label 简短有力，不超过 12 个字。

必须严格以纯 JSON 格式返回，不要包含 markdown 代码块标记，不要有任何解释文字：
{
  "id": "root",
  "label": "总目标",
  "children": [
    {
      "id": "1",
      "label": "核心模块名",
      "children": [
        { "id": "1-1", "label": "具体任务", "children": [] },
        { "id": "1-2", "label": "具体任务", "children": [] }
      ]
    },
    {
      "id": "2",
      "label": "核心模块名",
      "children": [...]
    }
  ]
}`

// 错误消息映射
const ERROR_MESSAGES = {
  400: '请求参数错误，请检查输入',
  401: 'API 密钥无效或已过期，请在设置中更新',
  403: '访问被拒绝，请检查 API 权限',
  404: 'API 端点不存在',
  429: '请求过于频繁，请稍后重试',
  500: '服务器内部错误，请稍后重试',
  502: '网关错误，请稍后重试',
  503: '服务暂时不可用，请稍后重试',
  504: '网关超时，请检查网络连接',
  network: '网络连接失败，请检查网络',
  timeout: '请求超时，请稍后重试',
}

function getErrorMessage(status, isNetworkError = false) {
  if (isNetworkError) {
    return ERROR_MESSAGES.network
  }
  return ERROR_MESSAGES[status] || `未知错误 (${status})`
}

export async function generateTaskTree(goal) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 60000) // 60秒超时

  let res
  let isNetworkError = false

  try {
    res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: goal },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
      signal: controller.signal,
    })
  } catch (err) {
    isNetworkError = true
    if (err.name === 'AbortError') {
      throw new Error(ERROR_MESSAGES.timeout)
    }
    throw new Error(getErrorMessage(null, true))
  } finally {
    clearTimeout(timeoutId)
  }

  if (!res.ok) {
    throw new Error(getErrorMessage(res.status))
  }

  const data = await res.json()

  // 检查 API 返回的业务错误
  if (data.error) {
    const errorMsg = data.error.message || data.error.type || '未知错误'
    throw new Error(`API 返回错误: ${errorMsg}`)
  }

  const content = data.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('AI 未返回有效内容，请重试')
  }

  const cleaned = content
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    throw new Error(`AI 返回格式解析失败，请重试`)
  }
}

let idCounter = 0

export function hydrateTree(node) {
  idCounter = 0
  return walk(node)
}

function walk(node) {
  return {
    id: node.id || `g${++idCounter}`,
    label: node.label,
    status: 'pending',
    children: (node.children || []).map(walk),
  }
}

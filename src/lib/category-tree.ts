export type CategoryNode = {
  id: string
  name: string
  parent_id: string | null
}

/** Depth-first, parent immediately followed by its children, siblings alphabetical. */
export function flattenCategoriesDepthFirst<T extends CategoryNode>(
  categories: T[]
): (T & { depth: number })[] {
  const childrenByParent = new Map<string | null, T[]>()
  for (const category of categories) {
    const key = category.parent_id
    if (!childrenByParent.has(key)) childrenByParent.set(key, [])
    childrenByParent.get(key)!.push(category)
  }
  for (const siblings of childrenByParent.values()) {
    siblings.sort((a, b) => a.name.localeCompare(b.name))
  }

  const result: (T & { depth: number })[] = []
  function visit(parentId: string | null, depth: number) {
    for (const node of childrenByParent.get(parentId) ?? []) {
      result.push({ ...node, depth })
      visit(node.id, depth + 1)
    }
  }
  visit(null, 0)
  return result
}

/** Full breadcrumb path for a category, e.g. "Balanceado > Gato > Adulto". */
export function categoryPath(categoryId: string, categories: CategoryNode[]): string {
  const byId = new Map(categories.map((c) => [c.id, c]))
  const parts: string[] = []
  let current = byId.get(categoryId)
  while (current) {
    parts.unshift(current.name)
    current = current.parent_id ? byId.get(current.parent_id) : undefined
  }
  return parts.join(" > ")
}

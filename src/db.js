import Dexie from 'dexie'

const db = new Dexie('YoyooDesign')

db.version(1).stores({
  pages: 'id,alias,bg,guides,height,width,nodes,parentid,projectid,type',
})

export const addPage = (data) => {
  return db.pages.add(data)
}

export const updatePage = (data) => {
  console.log('updatePage', JSON.stringify(data))
  return db.pages.update(data.id, data).then((res) => {
    // 主键类型不匹配（字符串/数字）时 Dexie update 静默不写入，这里显式告警便于排查
    if (res.numFailures > 0) {
      console.warn('updatePage 未匹配到主键（记录不存在或 id 类型不一致）:', data.id)
    }
    return res
  })
}

export const deletePage = (id) => {
  return db.pages.delete(id)
}

export const getPages = () => {
  return db.pages.toCollection().toArray()
}

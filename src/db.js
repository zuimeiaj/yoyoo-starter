import Dexie from 'dexie'

const db = new Dexie('YoyooDesign')

db.version(1).stores({
  pages: 'id,alias,bg,guides,height,width,nodes,parentid,projectid,type',
})

export const addPage = (data) => {
  return db.pages.add(data)
}

export const updatePage = (data) => {
  return db.pages.update(data.id, data)
}

export const deletePage = (id) => {
  return db.pages.delete(id)
}

export const getPages = () => {
  return db.pages.toCollection().toArray()
}

import {findPageIndex, findPageItem} from "./instance";
import {TestPageData} from "../mock";



/**
 *
 * @param {String} moveid 移动的对象
 * @param {String} targetid 目标对象
 * @param {boolean} asChild 作为子对象插入到目标对象，false 将在target后面插入
 * @return {Array}
 */
export const sortPage = (moveid, targetid, asChild) =>{
    let item = findPageItem(targetid, TestPageData)
    let move = findPageItem(moveid, TestPageData)
    let mparentid = move.parentid
    //  删除原数据
    if (mparentid && mparentid != -1) {
        let parent = findPageItem(mparentid, TestPageData)
        let moveindex = findPageIndex(parent.items, moveid)
        parent.items.splice(moveindex, 1)
    } else {
        let moveindex = findPageIndex(TestPageData, moveid)
        TestPageData.splice(moveindex, 1)
    }
    if (asChild) {
        if (!item.items) {
            item.items = []
        }
        item.items.unshift(move)
        move.parentid = targetid
    } else {
        //  插入数据
        if (item.parentid && item.parentid != -1) {
            let parent = findPageItem(item.parentid, TestPageData)
            let targetindex = findPageIndex(parent.items, targetid)
            move.parentid = parent.id
            parent.items.splice(targetindex + 1, 0, move)
        } else {
            let targetindex = findPageIndex(TestPageData, targetid)
            TestPageData.splice(targetindex + 1, 0, move)
            move.parentid = -1
        }
    }
    return TestPageData
}

window.page = TestPageData
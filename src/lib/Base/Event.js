/**
 * created by yaojun on 2018/12/1
 * @description simple event handler
 */
import {NeedResponderAction} from "../util/actions";
import {getFirstResponder} from "../global/instance";

class Event{
    constructor(){
        this.listeners = {}
        window._event = this
    }
    
    listen(name, callback){
        if(this.listeners[name]) {
            this.listeners[name].push(callback)
        } else {
            this.listeners[name] = [callback]
        }
    }
    
    /**
     * @memberOf Event
     * @param params
     */
    dispatch(...params){
        let action = params[0]
        if(NeedResponderAction[action]) {
            let responder = getFirstResponder()
            if(!responder) {
                console.info(`[Event Ignored (${action})]`, 'Target component does not exist')
                return
            }
        }
        // console.log('[Event Dispatch]', action)
        let cbs = this.listeners[action]
        let args = params.slice(1)
        if(!cbs) return
        for(let i = 0; i < cbs.length; i++) {
            if(typeof cbs[i] === 'function') {
                try {
                    cbs[i](...args)
                } catch(e) {
                    console.error('[Dispatch error]', e)
                }
            }
        }
    }
    
    destroy(name, callback){
        if(!this.listeners[name]) return
        if(!callback) return delete this.listeners[name]
        let index = this.listeners[name].findIndex(cb=>cb == callback)
        this.listeners[name].splice(index, 1)
    }
}

/**
 *
 * @type {Event}
 */
const event = new Event()
export default event


/**
 *  created by yaojun on 2019/5/15
 *
 */
import React from "react";

const Cache = {}
export default class CacheState extends React.Component{
    static getCacheState(key){
        return key ? Cache[key] : Cache
    }
    
    hasCacheData = false
    
    /**
     * @protected 必须实现该方法，对应缓存中的key
     * @return {null}
     */
    getCacheKey(){
        return null
    }
    
    clearCacheData = ()=>{
        Cache[this.getCacheKey()] = null
    }
    
    setState(state, cb){
        super.setState(state, ()=>{
            Cache[this.getCacheKey()] = this.state
            cb && cb()
        })
    }
    
    componentWillMount(){
        let key = this.getCacheKey()
        let data = Cache[key]
        if(data) {
            super.setState(data)
            this.hasCacheData = true
        }
    }
}
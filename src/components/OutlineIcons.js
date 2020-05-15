/**
 *  created by yaojun on 2019/1/16
 *
 */

import React from "react";
import Collapse from "../lib/ui/Collapse";
import {PresetIcons} from "../config/presetIcons";
import Icon from "../lib/PresetIcons";
import {Draggable} from "../lib/ui/NativeDragDrop";
import Search from "../lib/ui/Search";



export default class OutlineIcons extends React.Component {
    state = {
        items : [],
        source : [],
        searched : false
    }
    
    
    componentWillMount(){
        let items = Object.keys(PresetIcons).map((item) => PresetIcons[item])
        this.setState({
            items,
            source : items
        })
    }
    
    
    handleSearch = (value) =>{
        
        if (!value.trim()) return this.setState({items : this.state.source, searched : false})
        
        let searchValues = {
            title : value,
            items : []
        }
        let items = this.state.source.forEach(item =>{
            
            searchValues.items = searchValues.items.concat(item.items.filter(item =>{
                return item.name.indexOf(value) > -1
            }))
        })
        
        this.setState({items : searchValues, searched : true})
    }
    
    
    render(){
        const {items, source} = this.state
        return (<div className="root-layout-side-icons">
            <div style={{padding : 15}}>
                <Search onSearch={this.handleSearch} placeholder={'~~搜索'}/>
            </div>
            
            {this.state.searched ?
                <Collapse title={items.title}>
                    {
                        items.items.map(item =>{
                            return (
                                <Draggable key={item.data}
                                           params={item}>
                                    <Icon type={item.data}/>
                                </Draggable>
                            )
                        })
                    }
                </Collapse>
                : items.map(object =>{
                    return <Collapse collapse={object.name != '表单'} key={object.name} title={object.name}>
                        {
                            object.items.map(item =>{
                                return (
                                    <Draggable key={item.data}
                                               params={item}>
                                        <Icon type={item.data}/>
                                    </Draggable>
                                )
                            })
                        }
                    </Collapse>
                })
            }
        </div>)
    }
}
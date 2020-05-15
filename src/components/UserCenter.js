import React from 'react'
import './UserCenter.scss'
import Icon from "../lib/Icon";
import {Link, Route, withRouter} from 'react-router-dom'
import {Button, Card, Col, Form, Input, message, Modal, Radio, Row, Tooltip} from 'antd'
import {refres_user_info, refresh_project_list, refresh_user_info, show_create_project} from "../lib/util/actions";
import Event from "../lib/Base/Event";
import {createProject, deleteProject, fetchProjectList, updateProject} from "../api/project";
import {refresLocalPageObjectId} from "../lib/util/page";
import {fetchUserInfo, logout, updateUserInfo} from "../api/user";
import Clipboard from 'react-clipboard.js';
import {getOSSUrl} from "../api/config";
import NoContent from "../lib/ui/NoContent";
import Logo from "../lib/ui/Logo";
import {COMMUNITY_TUTORIAL, COMMUNITY_URL, PREVIEW_URL} from "@config";



const FormItem = Form.Item
const RadioGroup = Radio.Group
const Textarea = Input.TextArea

class Project extends React.Component {
    state = {
        list : []
    }
    
    
    componentWillMount(){
        this.fetch()
        Event.listen(refresh_project_list, this.fetch)
    }
    
    
    componentWillUnmount(){
        Event.destroy(refresh_project_list, this.fetch)
    }
    
    
    fetch = () =>{
        fetchProjectList().then(res =>{
            this.setState({list : res.data})
        })
    }
    
    handleDelete = (id) =>{
        Modal.confirm({
            title : '提示',
            content : '项目删除后不可恢复，确认继续？',
            onOk : () =>{
                deleteProject(id).then(this.fetch)
            }
        })
    }
    
    
    render(){
        return <Row gutter={12} className={'items'}>
            {
                this.state.list.map(item =>{
                    return (<Col className={'project-item'} key={item._id} span={6}>
                        <Card title={item.name}
                              actions={[
                                  <Tooltip title={'删除项目'}>
                                      <span><Icon onClick={() => this.handleDelete(item._id)} type={'delete'}/></span>
                                  </Tooltip>,
                                  <Tooltip title={'编辑'}>
                                      <span><Icon onClick={() => Event.dispatch(show_create_project, {
                                          pages : [],
                                          from : 'Edit',
                                          data : item
                                      })} type={'edit'}/>
                                      </span>
                                  </Tooltip>,
                                  <Tooltip title={'将链接分享给你的朋友'}>
                                      <span>
                                          <Clipboard onSuccess={() => message.success('复制成功')} component={'span'}
                                                     data-clipboard-text={`${PREVIEW_URL}?p=${item._id}`}><Icon
                                              type={'fenxiang'}/></Clipboard>
                                      </span>
                                  </Tooltip>,
                                  <Tooltip title={'开始设计'}>
                                      <Link to={`/app?p=${item._id}`}><Icon type={'design'}/></Link>
                                  </Tooltip>
                              ]}>
                            <div className={'ellipsis'}>{item.description || '...'}</div>
                        </Card>
                    </Col>)
                })
            }
            <NoContent show={this.state.list.length == 0}/>
        </Row>
    }
}

class SelfTemplate extends React.Component {
    render(){
        return <div className={'items'}>
        
        </div>
    }
}

class OnlineTemplate extends React.Component {
    render(){
        return <div className={'items'}>
        </div>
    }
}

class PersonalInfo extends React.Component {
    state = {
        loading : false
    }
    
    
    componentWillMount(){
        fetchUserInfo().then((res) =>{
            let data = res.data
            this.props.form.setFieldsValue({
                nickname : data.nickname,
                email : data.email,
                job : data.job,
                gender : data.gender,
                qq : data.qq,
                introduce : data.introduce,
                head : data.head
            })
        })
    }
    
    
    handleSubmit = (e) =>{
        e.preventDefault()
        this.props.form.validateFields((error, value) =>{
            if (error) return
            this.setState({loading : true})
            updateUserInfo(value).then(() =>{
                message.success('修改成功')
                Event.dispatch(refresh_user_info, value)
            }).finally(() =>{
                this.setState({loading : false})
            })
        })
    }
    
    
    render(){
        const requiredMsg = (msg) => ({rules : [{required : true, message : msg}]});
        const {getFieldDecorator} = this.props.form
        const layout = {
            wrapperCol : {span : 6},
            labelCol : {span : 8}
        }
        return <Form onSubmit={this.handleSubmit}>
            <FormItem {...layout} label="昵称">
                {
                    getFieldDecorator("nickname")(<Input/>)
                }
            </FormItem>
            <FormItem {...layout} label="邮箱">
                {
                    getFieldDecorator("email")(<Input disabled/>)
                }
            </FormItem>
            
            <FormItem labelCol={{span : 8}} wrapperCol={{span : 10}} label="职位">
                {
                    getFieldDecorator("job")(
                        <RadioGroup>
                            <Radio value={'UI'}>UI/UE/UID</Radio>
                            <Radio value={'PM'}>PM</Radio>
                            <Radio value={'FE'}>FE</Radio>
                            <Radio value={'RD'}>RD</Radio>
                            <Radio value={'OT'}>其他</Radio>
                        </RadioGroup>
                    )
                }
            </FormItem>
            <FormItem {...layout} label="性别">
                {
                    getFieldDecorator("gender")(
                        <RadioGroup>
                            <Radio value={'BOY'}>帅哥哥</Radio>
                            <Radio value={'GIRL'}>小姐姐</Radio>
                        </RadioGroup>
                    )
                }
            </FormItem>
            <FormItem {...layout} label="QQ">
                {
                    getFieldDecorator("qq")(<Input/>)
                }
            </FormItem>
            
            <FormItem {...layout} label="个性签名">
                {
                    getFieldDecorator("introduce")(<Textarea rows={3}/>)
                }
            </FormItem>
            
            
            <FormItem wrapperCol={{offset : 8}}>
                <Button loading={this.state.loading} htmlType={'submit'}>确认</Button>
            </FormItem>
        </Form>
    }
}

const PersonalInfoForm = Form.create()(PersonalInfo)

class CreateProject extends React.Component {
    
    state = {
        loading : false,
        visible : false,
        data : null
    }
    
    pages = null
    
    isEdit = false
    
    data = null
    
    
    componentWillMount(){
        Event.listen(show_create_project, this.handleShowModal)
    }
    
    
    componentWillUnmount(){
        Event.destroy(show_create_project, this.handleShowModal)
    }
    
    
    handleShowModal = (options = {}) =>{
        if (this.state.visible) return
        let data = options.data || null
        this.setState({visible : true, data, from : options.from})
        this.pages = options.pages
        this.isEdit = options.from == 'Edit'
        this.data = data
        if (options.from == 'Edit') {
            
            this.props.form.setFieldsValue({
                name : data.name,
                type : data.type,
                description : data.description,
                secret : data.secret
            })
        } else {
            this.props.form.resetFields()
        }
    }
    
    applySubmit = (value) =>{
        
        if (this.isEdit) {
            value = Object.assign({}, value)
            value.id = this.data._id
            return updateProject(value).then(() =>{
                this.setState({show : ''})
                message.success('修改成功')
                Event.dispatch(refresh_project_list)
            })
        } else {
            return createProject(value).then((result) =>{
                let data = result.data
                this.props.history.replace(`/app?p=${data._id}&s=${data.default_page}`)
                this.setState({show : ''})
                location.reload()
            })
        }
        
    }
    
    handleSubmit = (e) =>{
        e.preventDefault()
        this.props.form.validateFields((error, value) =>{
            if (error) return
            value = Object.assign({}, value)
            value.access_type = value.secret ? 'PRIVATE' : 'PUBLIC'
            this.setState({loading : true})
            this.applySubmit(value).finally(() =>{
                this.setState({loading : false})
            })
        })
    }
    
    handleClose = () =>{
        this.setState({visible : false})
    }
    
    
    render(){
        const {getFieldDecorator} = this.props.form
        const layout = {
            wrapperCol : {span : 18},
            labelCol : {span : 4}
        }
        
        const requiredMsg = (msg) => ({rules : [{required : true, message : msg}]});
        return <Modal onCancel={this.handleClose} onOk={this.handleSubmit} className={'create-project-modal'}
                      width={600}
                      title={this.isEdit ? '编辑' : '新建'}
                      visible={this.state.visible}>
            <Form className={'create-project-form'} onSubmit={this.handleSubmit}>
                <FormItem label={'名称'} {...layout}>
                    {
                        getFieldDecorator('name', requiredMsg('请输入项目名称'))(<Input placeholder={'请输入项目名称'}
                                                                                 data-event={'ignore'}/>)
                    }
                </FormItem>
                <FormItem {...layout} label={'项目类型'}>
                    {
                        getFieldDecorator('type', requiredMsg('请选择项目类型'))(
                            <RadioGroup>
                                <Radio value={'MOBILE'}><Icon type={'mobile'}/></Radio>
                                <Radio value={'PC'}><Icon type={'pc'}/></Radio>
                                <Radio value={'PAD'}><Icon type={'pingban'}/></Radio>
                            </RadioGroup>
                        )
                    }
                </FormItem>
                <FormItem label={'访问密码'} extra={'设置此项时，分享给他人需要输入密码才能访问'} {...layout} >
                    {
                        getFieldDecorator('secret')(<Input placeholder={'请输入访问密码'} data-event={'ignore'}/>)
                    }
                </FormItem>
                
                <FormItem {...layout} label={'备注'}>
                    {
                        getFieldDecorator('description')(<Textarea placeholder={'请输入描述'} data-event={'ignore'}
                                                                   rows={2}/>)
                    }
                </FormItem>
            </Form></Modal>
    }
}

const CreateProjectForm = Form.create()(CreateProject)
export const CreateProjectModal = withRouter(CreateProjectForm)
export default class UserCenter extends React.Component {
    state = {
        info : {}
    }
    
    
    componentWillMount(){
        Event.listen(refresh_user_info, this.handleRefreshUserInfo)
        fetchUserInfo().then((res) =>{
            this.handleRefreshUserInfo(res.data)
        })
    }
    
    
    handleRefreshUserInfo = (data) =>{
        this.setState({info : data})
    }
    
    
    componentWillUnmount(){
        Event.destroy(refresh_user_info, this.handleRefreshUserInfo)
    }
    
    
    handleCreateProject = () =>{
        Event.dispatch(show_create_project, {pages : [], from : 'Create'})
    }
    
    handleExit = () =>{
        Modal.confirm({
            title : '提示',
            content : '确认退出该系统吗？',
            onOk : () =>{
                logout().then(() => location.reload())
            }
        })
    }
    
    
    render(){
        return (<div className={'user-center-page'}>
            <nav className={'header'}>
                <span className={'logo'}><Logo height={28}/> </span>
                <ul className={'menu'}>
                    <li><a href={COMMUNITY_TUTORIAL}>教程</a></li>
                    <li><a href={COMMUNITY_URL}>FE前端社区</a></li>
                    <li><a onClick={this.handleExit}><Icon style={{color : '#fff'}} type={'tuichu'}/> 退出</a></li>
                </ul>
            </nav>
            <div className={'banner'}>
            </div>
            <div className={'info'}>
                <div className={'avatar'}>
                    <div className={'head'}>
                        {this.state.info.head ?
                            <img src={getOSSUrl(`${this.state.info.head}`)}/>
                            : <img src={require('../assets/default_avatar.svg')}/>
                        }
                    </div>
                    <div className={'name'}>{this.state.info.nickname}</div>
                </div>
                <div className={'tabs'}>
                    <div className={'desc'}>{this.state.info.introduce}</div>
                    <ul>
                        <li>
                            <Link to={'/ucenter/project'}>项目</Link>
                        </li>
                        <li>
                            <Link to={'/ucenter/info'}>信息</Link>
                        </li>
                        <li style={{padding : '0 10px'}} onClick={this.handleCreateProject}
                            className={'create-project'}><Icon type={'jia1'}/>创建项目
                        </li>
                    </ul>
                </div>
            </div>
            <div className={'content'}>
                <Route path={'/ucenter/project'} component={Project}/>
                <Route path={'/ucenter/info'} component={PersonalInfoForm}/>
            </div>
        </div>)
    }
}
/**
 *  created by yaojun on 2019/4/22
 *
 */
import React from "react";
import {Button, Col, Form, Input, message, Row} from 'antd'
import './Signup.scss'
import {sendEmailAuthCode, signin, signup, validateEmailHasRegister} from "../api/user";
import Countdown from "../lib/ui/Countdown";
import Logo from "../lib/ui/Logo";
import {withRouter} from 'react-router-dom'
import {getQuery} from "../lib/util/helper";
import debouce from 'debounce'
import Types from 'prop-types'

const FormItem = Form.Item

class SignUp extends React.Component{
    state = {
        emailStatus : false,
        loading : false,
        mode : 'IN' // UP | IN
    }
    handleSignup = (e)=>{
        e.preventDefault()
        this.props.form.validateFields(async(error, value)=>{
            if(error) return
            this.setState({loading : true})
            this.props.onSubmit(this.state.mode, value, this.state.pwd).catch(()=>{
                this.setState({loading : false})
            })
        })
    }
    changeMode = (e)=>{
        e.preventDefault()
        this.props.form.resetFields()
        this.setState({mode : this.state.mode == 'UP' ? 'IN' : 'UP', pwd : false})
    }
    changePwdMode = (e)=>{
        this.changeMode(e)
        this.setState({pwd : true})
    }
    handleEmailBlur = (e)=>{
        let value = e.target.value.trim()
        if(!value || this.state.mode == 'IN' || this.state.pwd) return
        this.props.form.validateFields(['email'], (error)=>{
            if(error) return
            validateEmailHasRegister(e.target.value).then(()=>{
                this.setState({emailStatus : true})
            }).catch(()=>{
                this.setState({emailStatus : false})
                this.props.form.setFields({
                    email : {
                        errors : [new Error('邮箱已注册')],
                        value
                    }
                })
            })
        })
    }
    sendCode = ()=>{
        return new Promise((resolve, reject)=>{
            this.props.form.validateFields(['email'], (error, value)=>{
                if(error) return reject()
                sendEmailAuthCode(value.email, this.state.pwd ? 'RESETPWD' : 'REGISTER').then(()=>{
                    message.success('验证码发送成功')
                    resolve()
                }).catch((res)=>{
                    if(res.response.data.errcode == 10000) {
                        message.warn('验证码未使用')
                    }
                    reject()
                })
            })
        })
    }
    
    render(){
        const {getFieldDecorator} = this.props.form
        const requiredMsg = (msg, rule)=>{
            let arr = ({rules : [{required : true, message : msg}]})
            if(rule) arr.rules.push(rule)
            return arr
        }
        const MODE = this.state.mode
        const isUP = MODE == 'UP'
        return (<Form colon={false} className={'singup-form'} onSubmit={this.handleSignup}>
            
            <Row className={'form-content'}>
                <Col className={'form-controls'} span={24}>
                    <Logo/>
                    <div className={'description'}>简单易用的原型设计工具</div>
                    
                    <FormItem>
                        {
                            getFieldDecorator("email", requiredMsg('请输入邮箱地址', {
                                type : 'email',
                                message : '请输入正确的邮箱'
                            }))(<Input data-event={'ignore'}
                                       placeholder={'有效邮箱地址'}/>)
                        }
                    </FormItem>
                    {isUP && <FormItem>
                        {
                            getFieldDecorator('code', requiredMsg('请输入邮箱验证码'))(
                                <Input placeholder={'邮箱验证码'} data-event={'ignore'}/>)
                        }
                        <Countdown onClick={this.sendCode} className={'send-code'}>发送验证码</Countdown>
                    </FormItem>}
                    <FormItem>
                        {
                            getFieldDecorator("password", requiredMsg('请输入密码', {
                                pattern : /\w{6,32}/,
                                message : '密码不能低于6位',
                                trigger : 'blur'
                            }))(
                                <Input data-event={'ignore'}
                                       type={'password'}
                                       placeholder={'请输入密码'}/>)
                        }
                    </FormItem>
                    
                    <FormItem>
                        <Button loading={this.state.loading} block size={'large'} type={'primary'}
                                htmlType={'submit'}>{isUP ? (this.state.pwd ? '重置密码' : '注册') : '登录'}</Button>
                    </FormItem>
                    <div>
                        <a className={'form-extra left'}
                           onClick={this.changeMode}>{isUP ? '已有账号？立即登录' : '没有账号？立即注册'}</a>
                        <a className={'form-extra right'} onClick={this.changePwdMode}>{!isUP ? '忘记密码' : ''}</a>
                    </div>
                </Col>
            </Row>
        
        </Form>)
    }
}

const WrapperForm = Form.create()(SignUp)

class SignupFormModal extends React.Component{
    state = {
        show : ''
    }
    handleSubmit = (mode, value, ispwd)=>{
        let promise
        if(mode == 'UP') {
            value = Object.assign({}, value, {type : ispwd ? 'RESETPWD' : 'REGISTER'})
            if(ispwd) {
                promise = signup(value).then(()=>{
                    message.success('密码重置成功')
                })
            } else {
                promise = signup(value).then(()=>{
                    message.success('注册成功')
                })
            }
        } else {
            promise = signin(value).then(()=>{
                message.success('登录成功')
            })
        }
        return promise.then(()=>{
            let callback = getQuery().callback
            if(callback) callback = decodeURIComponent(callback)
            else callback = '/ucenter/project'
            this.props.history.replace(callback)
        })
    }
    
    render(){
        return (<div className={'app-signing'}>
            <CanvasEffects/>
            <div className={'app-signing-wrapper'}>
                <WrapperForm onSubmit={this.handleSubmit}/>
            </div>
        </div>)
    }
}

class CanvasEffects extends React.Component{
    static propTypes = {
        count : Types.number,
        transparency : Types.number,
        radius : Types.number,
        vx : Types.number,
        vy : Types.number,
        vr : Types.number,
        va : Types.number
    }
    static defaultProps = {
        count : 50,
        transparency : 0.55,
        radius : 50,
        vx : 0.15,
        vy : 0.15,
        vr : 0.05,
        va : 0.0005
    }
    
    componentDidMount(){
        this.initCanvas()
        let ratio = this.ratio
        let ctx = this.refs.canvas.getContext('2d')
        ctx.scale(ratio, ratio)
        this.ctx = ctx
        this.drawCicle()
        this.startTicker()
        this.handleResize = debouce(this.handleResize, 300)
        window.addEventListener('resize', this.handleResize, false)
    }
    
    initCanvas = ()=>{
        let canvas = this.refs.canvas
        let ratio = window.devicePixelRatio || 1
        this.ratio = ratio
        canvas.width = window.innerWidth * ratio
        canvas.height = window.innerHeight * ratio
        canvas.style.width = window.innerWidth + 'px'
        canvas.style.height = window.innerHeight + "px"
    }
    handleResize = ()=>{
        this.initCanvas()
        this.ctx.clearRect(0, 0, screen.width, screen.height)
        this.ctx.scale(this.ratio, this.ratio)
        this.drawCicle()
    }
    drawCicle = ()=>{
        let ctx = this.ctx
        let bounce = [-1, 1, -1, 1, -1, 1, -1, 1, -1]
        let circles = []
        for(let i = 0; i < this.props.count; i++) {
            let x = Math.random() * window.innerWidth
            let y = Math.random() * window.innerHeight
            let r = Math.random() * this.props.radius
            let bx = Math.floor(Math.random() * 10)
            let by = Math.floor(Math.random() * 10)
            let br = Math.floor(Math.random() * 10)
            let bc = Math.floor(Math.random() * 10)
            circles.push({
                x, y, r, color : this.randomColor(), bx : bounce[bx], by : bounce[by], br : bounce[br], bc : bounce[bc]
            })
        }
        this.circles = circles
    }
    getColor = (color)=>{
        let {r, g, b, a} = color
        return `rgba(${r},${g},${b},${a})`
    }
    startTicker = (circles)=>{
        const animate = ()=>{
            this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
            this.circles.forEach((item)=>{
                const {x, y, r, color} = item
                const {vx, vr, vy, va} = this.props
                this.ctx.fillStyle = this.getColor(color)
                this.ctx.beginPath()
                this.ctx.arc(x, y, r, 0, 2 * Math.PI, false)
                this.ctx.fill()
                item.x += Math.random() * vx * item.bx
                item.y += Math.random() * vy * item.by
                item.r += Math.random() * vr * item.br
                color.a += Math.random() * va * item.bc
                if(item.x > window.innerWidth) {
                    item.bx = -1
                } else if(item.x < 0) {
                    item.bx = 1
                }
                if(item.y > window.innerHeight) {
                    item.by = -1
                } else if(item.y < 0) {
                    item.by = 1
                }
                if(item.r > this.props.radius) {
                    item.br = -1
                } else if(item.r <= 0) {
                    item.br = 1
                    item.r = 1
                }
                if(item.color.a >= this.props.transparency) {
                    item.bc = -1
                } else if(item.color.a <= 0) {
                    item.bc = 1
                }
            })
        }
        this.timer = setInterval(animate, 40)
    }
    randomColor = ()=>{
        let r = Math.floor(Math.random() * 100 + 156)
        let g = Math.floor(Math.random() * 100 + 156)
        let b = Math.floor(Math.random() * 100 + 156)
        let a = Math.random() * 0.5
        return {r, g, b, a}
    }
    
    componentWillUnmount(){
        clearInterval(this.timer)
        window.removeEventListener('resize', this.handleResize, false)
    }
    
    render(){
        return <canvas ref={'canvas'} className={'canvas-effects'}></canvas>
    }
}

export default withRouter(SignupFormModal)
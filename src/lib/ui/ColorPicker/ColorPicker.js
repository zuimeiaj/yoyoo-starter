/**
 *  created by yaojun on 2018/12/14
 *
 */

import React from 'react'
import './ColorPicker.scss'
import NumberInput from '../NumberInput'
import Draggable from '../../Draggable'
import { Dom } from '../../util/helper'
import Icon from '../../Icon'
import { Tooltip } from 'antd'
import Event from '../../Base/Event'
import { colorpicker_active, component_drag_before, context_hide_color_picker } from '../../util/actions'

const presets = [
  'rgba(244, 67, 54,1)',
  'rgba(233, 30, 99,1)',
  'rgba(255, 152, 0,1)',
  'rgba(33, 150, 243,1)',
  'rgba(255, 255, 255,1)',
  'rgba(0, 0, 0,1)',
  'rgba(139, 195, 74,1)',
  'rgba(103, 58, 183,1)',
  'rgba(63, 81, 181,1)',
  'rgba(158, 158, 158,1)',
]
var common = ['rgba(255,0,0,1)']
export default class ColorPicker extends React.Component {
  constructor() {
    super()
    //  当前输入控件，取色器关闭后将会给该输入控件赋值

    this._input = null
    this.isShow = false
    this.isNone = false
    this.isModify = false
    // 色板 尺寸
    this.size = {
      h: 208,
      s: 280,
      v: 140,
      drag: 14,
    }
    Event.listen(colorpicker_active, this.onPickerShow)
    Event.listen(context_hide_color_picker, this.justClosePicker)
    Event.listen(component_drag_before, this.justClosePicker)
  }

  handleContextClick = () => {
    this.handleClosePicker()
  }

  /**
   * 该对象必须含有一个setValue函数,和value属性
   * @param input
   */
  onPickerShow = (input) => {
    this.isShow = true
    this.isModify = false
    this.picker.show()
    this.initPosition(input.mouseX, input.mouseY)
    this._input = input
    if (input.value !== 'none') {
      this.rgba = Color.parse(input.value)
      this.isNone = false
      this.initColor()
    } else {
      this.rgba = { r: 255, g: 255, b: 255, a: 1 }
      this.isNone = true
      this.initColor()
    }
  }

  initColor = () => {
    // HSV
    this.setHsvFromRgb()
    //  R G B A
    this.setInputValues(this.rgba)
    // Transparency bar
    this.handleInputChangeA(this.rgba.a * 100)
    this.updatePreview(true)
  }

  initPosition = (x, y) => {
    x -= 262
    y -= 355
    if (y <= 0) y = 0
    if (x < 0) x = 0

    this.picker.left(x)
    this.picker.top(y)
  }

  componentDidMount() {
    let { sb, sbg, hui, huig, transparency, track, preview, picker, gradientPicker } = this.refs
    // Dom refs
    this.sb = Dom.of(sb)
    this.hui = Dom.of(hui)
    this.picker = Dom.of(picker)
    // default alpha
    this.transparency = Dom.of(transparency)
    // default 255,0,0

    picker.addEventListener('mouseleave', this.notifyChange, false)
    new Draggable(sbg, {
      pointLimit: true,
      onDragStart: this.handleSBAreaMove,
      onDragMove: this.handleSBAreaMove,
    })
    new Draggable(huig, {
      pointLimit: true,
      onDragStart: this.handleHuiMove,
      onDragMove: this.handleHuiMove,
    })

    new Draggable(track, {
      pointLimit: true,
      onDragStart: this.handleAlphaMove,
      onDragMove: this.handleAlphaMove,
    })
  }

  handleSBAreaMove = ({ pointX, pointY }) => {
    this.isNone = false
    let half = this.size.drag / 2
    let x = pointX - half,
      y = pointY - half
    this.sb.left(x)
    this.sb.top(y)
    // update hsv
    this.hsv.s = pointX / this.size.s

    this.hsv.v = 1 - pointY / this.size.v

    // update values of rgba
    this.setRgbColorFromHsv()
  }

  handleHuiMove = ({ pointX }) => {
    this.isNone = false
    this.hsv.h = pointX / this.size.h
    this.hui.left(pointX - this.size.drag / 2)
    // update values of rgba
    this.setRgbColorFromHsv()
    // Update hui color
    this.setHueAreaColor()
  }

  handleAlphaMove = ({ pointX }) => {
    this.isNone = false
    // move the dom
    this.transparency.left(pointX - this.size.drag / 2)
    // update alpha of rgba
    this.rgba.a = +(pointX / this.size.h).toFixed(2)
    this.updatePreview()
    // update values
    this.refs.a.setValue(Math.floor(this.rgba.a * 100))
  }

  applyGradientColor = (color) => {
    if (this.currentGradient) {
      if (color) {
        this.currentGradient.attr('data-color', color)
      }

      let list = this.gradientList
      list = list.sort((a, b) => +a.data('percentage') - b.data('percentage'))
      let line_gradient = `linear-gradient(90deg,${list
        .map((item) => {
          return item.data('color') + ' ' + item.data('percentage') + '%'
        })
        .join(',')})`
      this.refs.gradientPicker.style.background = line_gradient
      return line_gradient
    }
  }

  updatePreview = (isInit) => {
    let color = Color.toString(this.rgba)
    let gradient = this.applyGradientColor(color)
    // update preview
    this.refs.preview.style.background = gradient || color

    if (!isInit) {
      this.isModify = true
      this._input.notifyChange(gradient || color, true)
    }
  }

  notifyChange = () => {
    if (!this.isModify) return
    this.isModify = false
    this._input.notifyChange(Color.toString(this.rgba))
  }

  setInputValues = (color) => {
    let { r, g, b, a } = this.refs

    r.setValue(color.r)
    g.setValue(color.g)
    b.setValue(color.b)
    a.setValue(Math.round(color.a * 100))
  }

  setRgbColorFromHsv = () => {
    let rgb = Color.HSV2RGB(this.hsv)
    // update rgba
    this.rgba = Object.assign({}, this.rgba, rgb)

    // input values
    this.setInputValues(this.rgba)
    // transparency bar
    this.setTransparencyTrack()

    this.updatePreview()

    this.refs.hex.value = Color.toHex(this.rgba)
  }

  setTransparencyTrack = () => {
    let transparency = Object.assign({}, this.rgba)
    transparency.a = 0.05
    let start = Color.toString(transparency)
    transparency.a = 1
    let end = Color.toString(transparency)
    this.refs.gradient.style.background = `linear-gradient(to right,${start},${end})`
  }

  setHueAreaColor = () => {
    // hui area
    let sbgColor = Color.HSV2RGB(this.hsv.h, 1, 1)
    sbgColor.a = 1
    this.refs.sbg.style.background = Color.toString(sbgColor)
  }

  setHsvFromRgb = () => {
    this.hsv = Color.RGB2HSV(this.rgba)
    let half = this.size.drag / 2
    // H bar
    this.hui.left(this.hsv.h * this.size.h - half)
    // S
    this.sb.left(this.hsv.s * this.size.s - half)
    // V
    this.sb.top((1 - this.hsv.v) * this.size.v - half)
    //  H S(1) V(1)
    this.setHueAreaColor()
    //  Transparency bar
    this.setTransparencyTrack()

    this.refs.hex.value = Color.toHex(this.rgba)
  }

  handleInputChangeR = (r) => {
    this.isNone = false
    this.rgba.r = r
    this.setHsvFromRgb()
  }

  handleInputChangeG = (g) => {
    this.isNone = false
    this.rgba.g = g
    this.setHsvFromRgb()
  }

  handleInputChangeB = (b) => {
    this.isNone = false
    this.rgba.b = b
    this.setHsvFromRgb()
  }

  handleInputChangeA = (a) => {
    this.isNone = false
    this.rgba.a = a / 100
    // sync slider bar
    this.transparency.left(this.rgba.a * this.size.h - this.size.drag / 2)
  }

  handlePresetsClick = (item) => {
    this.isNone = false
    this.rgba = Color.parse(item)
    this.setHsvFromRgb()
    this.setRgbColorFromHsv()
    // update transparency
    this.handleInputChangeA(this.rgba.a * 100)
  }

  justClosePicker = () => {
    if (this.isShow === false) return
    if (this.isNone === true) return
    this.isShow = false
    this.isModify = false
    this.picker.hide()
    let color = Color.toString(this.rgba)

    let common = localStorage.getItem('common_color')
    if (common) common = JSON.parse(common)
    else common = []

    if (common.indexOf(color) === -1) {
      common.unshift(color)
    }
    common = common.slice(0, 10)
    localStorage.setItem('common_color', JSON.stringify(common))
    return color
  }

  // Close picker
  handleClosePicker = () => {
    let color = this.justClosePicker()
    if (color) {
      // set input value
      this._input.notifyChange(color)
    }
  }

  handleHexChange = (e) => {
    let hex = e.target.value
    if (hex.length === 7) {
      let color = Color.HEX2RGB(hex)
      color.a = this.rgba.a
      this.rgba = color
      this.initColor()
    }
  }

  componentWillUnmount() {
    Event.destroy(colorpicker_active, this.onPickerShow)
    Event.destroy(context_hide_color_picker, this.justClosePicker)
    Event.destroy(component_drag_before, this.justClosePicker)
  }

  deleteGradientColor = () => {
    let index = this.gradientList.findIndex((item) => item.dom === this.currentGradient.dom)
    this.gradientList.splice(index, 1)
    this.refs.gradientPicker.removeChild(this.currentGradient.dom)
    this.currentGradient = null
    Dom.of(this.refs.delGradient).hide()
  }

  handleSystemColorChange = (e) => {
    if (this.isShow == false) return
    this.handleHexChange(e)
    this.isModify = true
    this._input.notifyChange(Color.toString(this.rgba), true)
  }

  render() {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ display: 'none' }}
        ref={'picker'}
        className={'aj-color-picker'}
      >
        <div className={'header-bar'}>
          <Tooltip placement={'left'} title={' 选择系统颜色拾取时，需要关闭该面板才能生效'}>
            <span>
              <input onBlur={this.handleSystemColorBlur} onChange={this.handleSystemColorChange} type={'color'} />
            </span>
          </Tooltip>

          <Icon onClick={this.handleClosePicker} type={'guanbi'} />
        </div>
        <div ref={'sbg'} className={'sb-area'}>
          <div className={'sb-bg'}>
            <div ref={'sb'} className={'sb-drag'}></div>
          </div>
        </div>
        <div className={'bar-area'}>
          <div className={'preview'}>
            <div ref={'preview'}></div>
          </div>
          <div className={'slider-bar'}>
            <div ref={'huig'} className={'hui-area'}>
              <div ref={'hui'} className={'hui-drag'}></div>
            </div>
            <div ref={'track'} className={'transparency-area'}>
              <div ref={'gradient'} className={'alpha-bg'} />
              <div ref={'transparency'} className={'trans-drag'}></div>
            </div>
          </div>
        </div>
        <div className={'values'}>
          <NumberInput min={0} max={255} onChange={this.handleInputChangeR} ref={'r'} />
          <NumberInput min={0} max={255} onChange={this.handleInputChangeG} ref={'g'} />
          <NumberInput min={0} max={255} onChange={this.handleInputChangeB} ref={'b'} />
          <NumberInput min={0} max={100} onChange={this.handleInputChangeA} ref={'a'} />
          <input
            ref={'hex'}
            onChange={this.handleHexChange}
            data-event="ignore"
            style={{ width: '23%', paddingLeft: 2 }}
            className={'aj-input'}
          ></input>
        </div>
        <div className={'labels'}>
          <span>R</span>
          <span>G</span>
          <span>B</span>
          <span>A</span>
          <span className={'hex'}>Hex</span>
        </div>

        <div className={'colors'}>
          <div>
            {presets.map((item) => (
              <a onClick={() => this.handlePresetsClick(item)} style={{ background: item }} key={item} />
            ))}
          </div>

          <CommonColor onClick={this.handlePresetsClick} />
        </div>
      </div>
    )
  }
}

class CommonColor extends React.Component {
  state = {
    list: [],
  }

  componentWillMount() {
    Event.listen(colorpicker_active, this.onShow)
  }

  onShow = () => {
    let color = localStorage.getItem('common_color')
    if (color) {
      color = JSON.parse(color)
    } else {
      color = []
    }
    this.setState({ list: color })
  }

  componentWillUnmount() {
    Event.destroy(colorpicker_active, this.onShow)
  }

  render() {
    return (
      <div>
        {this.state.list.map((item) => (
          <a onClick={() => this.props.onClick(item)} style={{ background: item }} key={item} />
        ))}
      </div>
    )
  }
}

class Color {
  /**
   *
   */
  static HSV2RGB(h, s, v) {
    var r, g, b, i, f, p, q, t
    if (arguments.length === 1) {
      ;(s = h.s), (v = h.v), (h = h.h)
    }
    i = Math.floor(h * 6)
    f = h * 6 - i
    p = v * (1 - s)
    q = v * (1 - f * s)
    t = v * (1 - (1 - f) * s)
    switch (i % 6) {
      case 0:
        ;(r = v), (g = t), (b = p)
        break
      case 1:
        ;(r = q), (g = v), (b = p)
        break
      case 2:
        ;(r = p), (g = v), (b = t)
        break
      case 3:
        ;(r = p), (g = q), (b = v)
        break
      case 4:
        ;(r = t), (g = p), (b = v)
        break
      case 5:
        ;(r = v), (g = p), (b = q)
        break
    }
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    }
  }

  static RGB2HSV(r, g, b) {
    if (arguments.length === 1) {
      ;(g = r.g), (b = r.b), (r = r.r)
    }
    var max = Math.max(r, g, b),
      min = Math.min(r, g, b),
      d = max - min,
      h,
      s = max === 0 ? 0 : d / max,
      v = max / 255

    switch (max) {
      case min:
        h = 0
        break
      case r:
        h = g - b + d * (g < b ? 6 : 0)
        h /= 6 * d
        break
      case g:
        h = b - r + d * 2
        h /= 6 * d
        break
      case b:
        h = r - g + d * 4
        h /= 6 * d
        break
    }

    return {
      h: h,
      s: s,
      v: v,
    }
  }

  static parse(str) {
    try {
      if (str.startsWith('rgb')) {
        if (str[3] === 'a') {
          let arr = str.slice(5, -1).split(',')
          let rgba = { r: +arr[0], g: +arr[1], b: +arr[2], a: +arr[3] }
          return rgba
        } else {
          let arr = str.slice(4, -1).split(',')
          let rgba = { r: +arr[0], g: +arr[1], b: +arr[2], a: 1 }
          return rgba
        }
      } else if (str[0] === '#') {
        return this.HEX2RGB(str)
      }
    } catch (e) {
      throw 'Invalid color'
    }
  }

  static toString({ r, g, b, a = 1 }) {
    return `rgba(${r},${g},${b},${a})`
  }

  static toHex({ r, g, b, a }) {
    r = r.toString(16).padStart(2, '0')
    g = g.toString(16).padStart(2, '0')
    b = b.toString(16).padStart(2, '0')
    return `#${r}${g}${b}`
  }

  static HEX2RGB(hex) {
    let r, g, b
    hex = hex[0] === '#' ? hex.slice(1) : hex
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16)
      g = parseInt(hex[1] + hex[1], 16)
      b = parseInt(hex[2] + hex[2], 16)
    } else if (hex.length === 6) {
      r = parseInt(hex[0] + hex[1], 16)
      g = parseInt(hex[2] + hex[3], 16)
      b = parseInt(hex[4] + hex[5], 16)
    } else {
      throw `Invalid hexadecimal ${hex}`
    }

    return { r, g, b, a: 1 }
  }
}

/**
 *  created by yaojun on 2019/5/5
 *
 */

import React from 'react';
import { Button, Form, Input } from 'antd';
import PAKO from 'pako';

class PAKOJS extends React.Component {
  handleSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    let code = this.props.form.getFieldValue('input');
    let output = this.props.form.getFieldValue('output');

    if (code) {
      code = new Buffer(code, 'base64');
      let data = PAKO.inflate(code, { to: 'string' });
      this.props.form.setFieldsValue({
        output: data,
      });
    }
    if (output) {
      let string = PAKO.deflate(output, { to: 'base64' });
      string = new Buffer(string).toString('base64');
      this.props.form.setFieldsValue({
        input: string,
      });
    }
  };

  render() {
    return (
      <Form style={{ padding: 25 }} onSubmit={this.handleSubmit}>
        <div>Input</div>
        {this.props.form.getFieldDecorator('input')(<Input.TextArea rows={5} placeholder={'encode after string'}></Input.TextArea>)}
        <div>Output</div>
        {this.props.form.getFieldDecorator('output')(<Input.TextArea rows={5} placeholder={'decode after string'}></Input.TextArea>)}
        <div></div>
        <Button type={'primary'} htmlType={'submit'}>
          Inflate
        </Button>
      </Form>
    );
  }
}

export default Form.create()(PAKOJS);

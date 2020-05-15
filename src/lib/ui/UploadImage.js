import React from 'react'
import {Icon, message, Upload} from 'antd';
import './UploadImage.scss'
import {getBaseUrl, getOSSUrl} from "../../api/config";



function getBase64(img, callback){
    const reader = new FileReader();
    reader.addEventListener('load', () => callback(reader.result));
    reader.readAsDataURL(img);
}


function beforeUpload(file){
    const isJPG = ['image/jpeg', 'image/png'].indexOf(file.type) > -1
    if (!isJPG) {
        message.error('只能上传png或者jpg格式图片');
    }
    const isLt2M = file.size / 1024 < 1024
    if (!isLt2M) {
        message.error('图片不能超过1MB，请压缩后上传');
    }
    return isJPG && isLt2M;
}


export default class UploadImage extends React.Component {
    state = {
        loading : false,
    };
    
    handleChange = (info) =>{
        if (info.file.status === 'uploading') {
            this.setState({loading : true});
            return;
        }
        if (info.file.status === 'done') {
            // Get this url from response in real world.
            this.props.onChange(info.file.response.data.filename)
            this.setState({loading : false})
        }
    }
    
    
    render(){
        const uploadButton = (
            <div>
                <Icon style={{fontSize : 20}} type={this.state.loading ? 'loading' : 'upload'}/>
                <div className="ant-upload-text">上传</div>
            </div>
        );
        const imageUrl = this.props.value ? getOSSUrl(this.props.value) : null
        return (
            <Upload
                name="file"
                listType="picture-card"
                className="aj-upload-image"
                showUploadList={false}
                action={getBaseUrl('file/upload')}
                beforeUpload={beforeUpload}
                onChange={this.handleChange}
            >
                {imageUrl ? <img width={100} height={100} src={imageUrl} alt="avatar"/> : uploadButton}
            </Upload>
        );
    }
}

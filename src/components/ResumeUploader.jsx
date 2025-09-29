import React from "react";
import { Upload, Button, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";

export default function ResumeUploader({ beforeUpload }) {
  return (
    <Upload beforeUpload={beforeUpload} showUploadList={false}>
      <Button icon={<UploadOutlined />}>Upload Resume (PDF/DOCX)</Button>
    </Upload>
  );
}

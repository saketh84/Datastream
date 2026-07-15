import React, { useState } from 'react';
import { Upload, ArrowRight, Download, FileType, CheckCircle2, AlertCircle } from 'lucide-react';
import axios from 'axios';

export default function FileConverter() {
    const [file, setFile] = useState(null);
    const [targetFormat, setTargetFormat] = useState('json');
    const [status, setStatus] = useState('idle'); // idle, uploading, success, error

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setStatus('idle');
    };

    const handleConvert = async () => {
        if (!file) return;
        setStatus('uploading');

        const formData = new FormData();
        formData.append('file', file);
        formData.append('target_format', targetFormat);

        try {
            // Replace with your actual backend endpoint
            const response = await axios.post('http://localhost:8000/api/v1/convert', formData, {
                responseType: 'blob',
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `converted_file.${targetFormat}`);
            document.body.appendChild(link);
            link.click();

            setStatus('success');
        } catch (err) {
            console.error(err);
            setStatus('error');
        }
    };

    return (
        <div className="conv-card">
            <div className="conv-upload-zone">
                <input type="file" id="fileInput" onChange={handleFileChange} hidden />
                <label htmlFor="fileInput" className="conv-drop-area">
                    <Upload size={40} className="conv-icon-muted" />
                    <p>{file ? file.name : "Click to upload or drag and drop"}</p>
                    <span className="conv-small-text">CSV, XLSX, or JSON (Max 50MB)</span>
                </label>
            </div>

            <div className="conv-settings">
                <div className="format-select-group">
                    <span className="label">Convert to:</span>
                    <div className="format-options">
                        {['json', 'csv', 'parquet'].map((fmt) => (
                            <button
                                key={fmt}
                                className={`format-btn ${targetFormat === fmt ? 'active' : ''}`}
                                onClick={() => setTargetFormat(fmt)}
                            >
                                {fmt.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    className="conv-action-btn"
                    onClick={handleConvert}
                    disabled={!file || status === 'uploading'}
                >
                    {status === 'uploading' ? 'Converting...' : 'Start Conversion'}
                    <ArrowRight size={18} />
                </button>
            </div>

            {status === 'success' && (
                <div className="conv-status success">
                    <CheckCircle2 size={18} /> Successfully converted! Your download should start automatically.
                </div>
            )}
            {status === 'error' && (
                <div className="conv-status error">
                    <AlertCircle size={18} /> Something went wrong. Please check the file format and try again.
                </div>
            )}
        </div>
    );
}
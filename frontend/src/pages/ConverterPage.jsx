import React from 'react';
import { motion } from 'framer-motion';
import FileConverter from '../components/FileConverter';
import '../styles/ConverterPage.css';

export default function ConverterPage() {
    return (
        <>
            <nav className="tk-glassy-floating-nav">
                <div className="tk-glassy-nav-inner">
                    <div className="tk-nav-logo">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '32px', height: '32px', backgroundColor: '#1F2937', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ width: '20px', height: '20px', border: '2px solid white', borderRadius: '3px', position: 'relative' }}>
                                    <div style={{ position: 'absolute', top: '4px', left: '3px', right: '3px', height: '2px', backgroundColor: 'white' }} />
                                    <div style={{ position: 'absolute', top: '9px', left: '3px', right: '3px', height: '2px', backgroundColor: 'white' }} />
                                </div>
                            </div>
                            <span style={{ fontSize: '18px', fontWeight: '700', color: '#1F2937', letterSpacing: '-0.02em' }}>
                                DATASTREAM
                            </span>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="conv-page">
                <main className="conv-main">
                    <header className="conv-header">
                        <motion.h1
                            className="conv-title"
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            File Converter
                        </motion.h1>
                        <motion.p
                            className="conv-subtitle"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            Convert between CSV, JSON, and Excel formats instantly.
                        </motion.p>
                    </header>

                    <section className="conv-content">
                        <FileConverter />
                    </section>
                </main>
            </div>
        </>
    );
}
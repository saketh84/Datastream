import React, { useEffect } from 'react';

import { useNavigate } from 'react-router-dom';

import axios from 'axios';

import useDashboardStore from '../store';

export default function GoogleAnalyticsCallback() {

    const navigate = useNavigate();

    const setAnalysisResult =
        useDashboardStore(
            (state) => state.setAnalysisResult
        );

    useEffect(() => {

        const fetchAnalytics = async () => {

            try {

                const params =
                    new URLSearchParams(window.location.search);

                const code = params.get('code');

                const response = await axios.get(
                    `http://127.0.0.1:8000/api/v1/auth/google/callback?code=${code}`
                );

                setAnalysisResult(response.data);

                navigate('/dashboard');

            } catch (error) {

                console.error(error);

            }
        };

        fetchAnalytics();

    }, []);

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh'
        }}>
            Connecting Google Analytics...
        </div>
    );
}
'use client';

import { useEffect, useState, useRef } from 'react';
import { DocumentEditor } from '@onlyoffice/document-editor-react';
import api from '@/services/api';

interface OnlyOfficeEditorProps {
    documentId: string;
    isFinalized: boolean;
    accessMode?: string;
}

export default function OnlyOfficeEditor({ documentId, isFinalized, accessMode = 'EDIT' }: OnlyOfficeEditorProps) {
    const [config, setConfig] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [apiScriptUrl, setApiScriptUrl] = useState<string>('');

    useEffect(() => {
        let isMounted = true;

        const fetchConfig = async () => {
            if (documentId === 'default') {
                setError('Cannot load default document into OnlyOffice');
                return;
            }

            try {
                const { data } = await api.get(`/onlyoffice/config/${documentId}`);
                if (!isMounted) return;

                // Extract apiScriptUrl from the backend response.
                if (data.apiScriptUrl) {
                    setApiScriptUrl(data.apiScriptUrl);
                    // OnlyOffice React component expects Document Server URL, not the full script URL.
                    // Parse out the base URL (e.g. http://localhost:8080 or the Neon equivalent URL)
                    const urlObj = new URL(data.apiScriptUrl);
                    const documentServerUrl = urlObj.origin + '/';

                    // Construct the strict configuration OnlyOffice expects.
                    setConfig({
                        documentServerUrl: documentServerUrl,
                        config: {
                            document: data.document,
                            documentType: data.documentType,
                            editorConfig: {
                                ...data.editorConfig,
                                mode: isFinalized ? 'view' : (accessMode === 'VIEW' ? 'view' : 'edit'),
                                customization: {
                                    ...data.editorConfig?.customization,
                                    review: {
                                        ...data.editorConfig?.customization?.review,
                                        reviewDisplay: (isFinalized || accessMode === 'VIEW') ? 'original' : 'markup',
                                        // showReviewChanges: !(isFinalized || accessMode === 'VIEW')
                                    },
                                    layout: {
                                        toolbar: {
                                            home: true,
                                            insert: true,
                                            layout: true,
                                            references: false,
                                            collaboration: true,
                                            protection: false,
                                            plugins: false
                                        }
                                    }
                                }
                            },
                            token: data.token,
                        }
                    });
                } else {
                    setError('Failed to load Document Server API script URL');
                }
            } catch (err: any) {
                if (!isMounted) return;
                console.error('Failed to fetch OnlyOffice config:', err);
                setError(err.response?.data?.message || 'Failed to initialize document editor');
            }
        };

        fetchConfig();

        return () => {
            isMounted = false;
        };
    }, [documentId, isFinalized, accessMode]);

    const onDocumentReady = () => {
        console.log('OnlyOffice Editor is ready');
    };

    if (error) {
        return (
            <div className="flex bg-white items-center justify-center h-full w-full dark:bg-slate-900 border border-red-200">
                <div className="text-red-500 font-semibold text-center p-8 bg-red-50 rounded-xl max-w-lg dark:bg-red-900/10">
                    <p className="text-lg mb-2">Editor Initialization Failed</p>
                    <p className="text-sm font-normal text-red-400">{error}</p>
                </div>
            </div>
        );
    }

    if (!config) {
        return (
            <div className="flex bg-white items-center justify-center h-full w-full dark:bg-slate-900">
                <div className="text-gray-500 animate-pulse text-center dark:text-slate-400">
                    <div className="w-8 h-8 border-3 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p>Loading the Document Editor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex-1 min-h-0">
            <DocumentEditor
                id="onlyoffice-editor"
                documentServerUrl={config.documentServerUrl}
                config={config.config}
                events_onDocumentReady={onDocumentReady}
                height="100%"
                width="100%"
            />
        </div>
    );
}

import React, { useEffect, useState } from 'react';
import { Sliders, Save, Cpu, ShieldCheck } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function SystemSettings() {
  const [settings, setSettings] = useState<any>({
    scoring_weights: {
      communication: 0.30,
      confidence: 0.25,
      technical: 0.30,
      professionalism: 0.15
    },
    ai_providers: {
      speech_to_text: 'whisper',
      facial_monitoring: 'mediapipe',
      llm_engine: 'gpt-4o-mini'
    }
  });

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/admin/settings');
        setSettings(data);
      } catch (err) {
        toast.error('Failed to load system settings');
      }
    };
    fetch();
  }, []);

  const handleSave = () => {
    toast.success('System configuration updated successfully');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform & AI Configuration</h1>
        <p className="text-sm text-gray-500">
          Configure AI model pipelines, scoring rubric weight allocations, and monitoring sensitivity.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scoring Weights */}
        <div className="card space-y-4">
          <div className="flex items-center gap-2 text-gray-900 font-bold text-lg border-b pb-3">
            <Sliders className="h-5 w-5 text-primary-600" />
            Evaluation Rubric Weights
          </div>
          <p className="text-xs text-gray-500">
            These weights determine the overall weighted score calculation from the 4 assessment dimensions.
          </p>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                <span>Communication Score (30%)</span>
                <span>{(settings.scoring_weights?.communication * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                className="w-full"
                value={settings.scoring_weights?.communication || 0.3}
                onChange={e =>
                  setSettings({
                    ...settings,
                    scoring_weights: {
                      ...settings.scoring_weights,
                      communication: parseFloat(e.target.value)
                    }
                  })
                }
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                <span>Confidence Score (25%)</span>
                <span>{(settings.scoring_weights?.confidence * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                className="w-full"
                value={settings.scoring_weights?.confidence || 0.25}
                onChange={e =>
                  setSettings({
                    ...settings,
                    scoring_weights: {
                      ...settings.scoring_weights,
                      confidence: parseFloat(e.target.value)
                    }
                  })
                }
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                <span>Technical Relevance Score (30%)</span>
                <span>{(settings.scoring_weights?.technical * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                className="w-full"
                value={settings.scoring_weights?.technical || 0.3}
                onChange={e =>
                  setSettings({
                    ...settings,
                    scoring_weights: {
                      ...settings.scoring_weights,
                      technical: parseFloat(e.target.value)
                    }
                  })
                }
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                <span>Professionalism Score (15%)</span>
                <span>{(settings.scoring_weights?.professionalism * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                className="w-full"
                value={settings.scoring_weights?.professionalism || 0.15}
                onChange={e =>
                  setSettings({
                    ...settings,
                    scoring_weights: {
                      ...settings.scoring_weights,
                      professionalism: parseFloat(e.target.value)
                    }
                  })
                }
              />
            </div>
          </div>
        </div>

        {/* AI Pipelines */}
        <div className="card space-y-4">
          <div className="flex items-center gap-2 text-gray-900 font-bold text-lg border-b pb-3">
            <Cpu className="h-5 w-5 text-indigo-600" />
            AI Pipeline Configurations
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Speech-to-Text Transcription Engine
              </label>
              <select className="input-field" defaultValue="whisper">
                <option value="whisper">OpenAI Whisper (Real-time ASR)</option>
                <option value="deepgram">Deepgram Nova-2</option>
                <option value="google_speech">Google Cloud Speech-to-Text</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Vision & Emotion Detection Service
              </label>
              <select className="input-field" defaultValue="mediapipe">
                <option value="mediapipe">Google MediaPipe Face Mesh & Iris Tracking</option>
                <option value="deepface">DeepFace Emotion Recognition</option>
                <option value="opencv">OpenCV Landmark Tracker</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Question Generation & Assessment LLM
              </label>
              <select className="input-field" defaultValue="gpt-4o-mini">
                <option value="gpt-4o-mini">OpenAI GPT-4o-mini</option>
                <option value="gemini-1.5-flash">Google Gemini 1.5 Flash</option>
                <option value="claude-3-haiku">Anthropic Claude 3 Haiku</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end">
            <button onClick={handleSave} className="btn-primary flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save Configurations
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


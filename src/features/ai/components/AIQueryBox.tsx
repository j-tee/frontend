/**
 * AI Query Box Component
 * Natural language query interface for business insights
 */

import React, { useState } from 'react'
import useAppDispatch from '../../../hooks/useAppDispatch'
import useAppSelector from '../../../hooks/useAppSelector'
import {
  processQuery,
  clearQueryResult,
  selectQueryResult,
  selectQueryLoading,
  selectQueryError,
  selectAICredits,
} from '../../../store/slices/aiSlice'
import './AIQueryBox.css'

interface AIQueryBoxProps {
  className?: string
  storefrontId?: string
  placeholder?: string
}

export const AIQueryBox: React.FC<AIQueryBoxProps> = ({
  className = '',
  storefrontId,
  placeholder = "Ask a question about your business... (e.g., 'How many Samsung TVs were sold in January?')",
}) => {
  const dispatch = useAppDispatch()
  const [query, setQuery] = useState('')
  
  const result = useAppSelector(selectQueryResult)
  const loading = useAppSelector(selectQueryLoading)
  const queryError = useAppSelector(selectQueryError)
  const credits = useAppSelector(selectAICredits)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!query.trim() || loading) return

    try {
      await dispatch(
        processQuery({
          query: query.trim(),
          storefront_id: storefrontId,
        }),
      ).unwrap()
    } catch (error) {
      console.error('Query failed:', error)
    }
  }

  const handleFollowUpClick = (followUpQuery: string) => {
    setQuery(followUpQuery)
  }

  const handleClear = () => {
    setQuery('')
    dispatch(clearQueryResult())
  }

  const rawBalance = credits?.balance
  const currentBalance = typeof rawBalance === 'number' ? rawBalance : Number(rawBalance) || 0
  const creditCost = 0.5
  const hasEnoughCredits = currentBalance >= creditCost

  return (
    <div className={`ai-query-box ${className}`}>
      <div className="query-header">
        <div className="header-left">
          <span className="icon">🤖</span>
          <h3>Ask About Your Business</h3>
        </div>
        
        {credits && (
          <div className="credit-display">
            <span className="credit-label">Credits:</span>
            <span className={`credit-value ${!hasEnoughCredits ? 'low' : ''}`}>
              {currentBalance.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="query-form">
        <div className="query-input-section">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            rows={3}
            disabled={loading}
            className="query-textarea"
          />
          
          <div className="query-actions">
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="clear-btn"
                disabled={loading}
              >
                Clear
              </button>
            )}
            
            <button
              type="submit"
              disabled={loading || !query.trim() || !hasEnoughCredits}
              className="submit-btn"
            >
              {loading ? (
                <>
                  <span className="spinner-small"></span>
                  Thinking...
                </>
              ) : (
                `Ask (${creditCost} credits)`
              )}
            </button>
          </div>
        </div>

        {!hasEnoughCredits && (
          <div className="insufficient-credits-warning">
            ⚠️ Insufficient credits. You need {creditCost} credits to ask questions.
          </div>
        )}
      </form>

      {queryError ? (
        <div className="query-result error-state">
          <div className="answer-section">
            <div className="answer-header">
              <span className="icon" role="img" aria-hidden="true">
                ⚠️
              </span>
              <h4>We couldn&apos;t complete that request</h4>
            </div>
            <div className="answer-content">
              <p className="friendly-error">Our AI service had a hiccup. Please try again in a moment.</p>
              <p className="error-details">{queryError}</p>
            </div>
          </div>
        </div>
      ) :
      result ? (
        <div className="query-result">
          <div className="answer-section">
            <div className="answer-header">
              <span className="icon">✅</span>
              <h4>Answer</h4>
            </div>
            <div className="answer-content">
              <p style={{ whiteSpace: 'pre-wrap' }}>{result.answer}</p>
            </div>
          </div>

          {result.follow_up_questions && result.follow_up_questions.length > 0 && (
            <div className="follow-up-section">
              <h5>❓ You might also want to ask:</h5>
              <div className="follow-up-buttons">
                {result.follow_up_questions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleFollowUpClick(q)}
                    className="follow-up-btn"
                    type="button"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {result.data && Object.keys(result.data).length > 0 && (
            <div className="data-section">
              <h5>📊 Data</h5>
              <div className="data-preview">
                <pre>{JSON.stringify(result.data, null, 2)}</pre>
              </div>
            </div>
          )}

          <div className="query-meta">
            <small>
              Processed in {result.processing_time_ms}ms • 
              Credits used: {result.credits_used} • 
              New balance:{' '}
              {(() => {
                const rawNewBalance = result.new_balance
                const numericNewBalance =
                  typeof rawNewBalance === 'number' ? rawNewBalance : Number(rawNewBalance) || 0
                return numericNewBalance.toFixed(2)
              })()}
            </small>
          </div>
        </div>
      ) : null}

      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>AI is analyzing your data...</p>
          <small>This may take a few seconds</small>
        </div>
      )}
    </div>
  )
}

export default AIQueryBox

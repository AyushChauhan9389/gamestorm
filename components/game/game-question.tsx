'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase'
import Image from 'next/image'

interface GameQuestion {
  id: string
  game_id: string
  question_index: number
  image_url: string | null
  question_text: string
  options: string[]
  reveal_time_seconds: number
  total_points_can_be_earned: number
  question_duration_seconds: number
}

interface GameQuestionProps {
  question: GameQuestion
  participantId: string
  onComplete: (pointsEarned: number) => void
}

export default function GameQuestion({ question, participantId, onComplete }: GameQuestionProps) {
  const [revealedBoxes, setRevealedBoxes] = useState<number>(0)
  const [currentPoints, setCurrentPoints] = useState<number>(question.total_points_can_be_earned)
  const [timeRemaining, setTimeRemaining] = useState<number>(question.question_duration_seconds)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [hasAnswered, setHasAnswered] = useState<boolean>(false)
  const [showAnswer, setShowAnswer] = useState<boolean>(false)
  const supabase = createClient()

  const totalBoxes = 9 // 3x3 grid of overlay boxes
  const boxRevealInterval = question.reveal_time_seconds * 1000 / totalBoxes
  const pointsPerBox = question.total_points_can_be_earned / totalBoxes

  useEffect(() => {
    // Timer for revealing boxes
    const revealTimer = setInterval(() => {
      setRevealedBoxes(prev => {
        const newRevealed = prev + 1
        const newPoints = Math.max(0, question.total_points_can_be_earned - (newRevealed * pointsPerBox))
        setCurrentPoints(Math.round(newPoints))
        
        if (newRevealed >= totalBoxes) {
          clearInterval(revealTimer)
        }
        return newRevealed
      })
    }, boxRevealInterval)

    // Timer for question duration
    const questionTimer = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 1
        if (newTime <= 0) {
          clearInterval(questionTimer)
          if (!hasAnswered) {
            handleTimeUp()
          }
        }
        return newTime
      })
    }, 1000)

    return () => {
      clearInterval(revealTimer)
      clearInterval(questionTimer)
    }
  }, [question.id, hasAnswered])

  const handleTimeUp = async () => {
    if (hasAnswered) return
    
    setHasAnswered(true)
    setShowAnswer(true)
    
    // Save answer as unanswered
    await saveAnswer(null, false, 0)
    
    // Auto-advance after showing answer
    setTimeout(() => {
      onComplete(0)
    }, 3000)
  }

  const handleAnswerSelect = async (answerIndex: number) => {
    if (hasAnswered) return
    
    setSelectedAnswer(answerIndex)
    setHasAnswered(true)
    setShowAnswer(true)
    
    // For this demo, we'll assume the first option is always correct
    // In a real app, you'd store the correct answer index in the database
    const isCorrect = answerIndex === 0
    const pointsEarned = isCorrect ? Math.round(currentPoints) : 0
    
    await saveAnswer(answerIndex, isCorrect, pointsEarned)
    
    // Show result for 3 seconds then advance
    setTimeout(() => {
      onComplete(pointsEarned)
    }, 3000)
  }

  const saveAnswer = async (answerIndex: number | null, isCorrect: boolean, pointsEarned: number) => {
    try {
      await supabase
        .from('game_answers')
        .insert({
          game_participant_id: participantId,
          game_question_id: question.id,
          answer_index: answerIndex,
          is_correct: isCorrect,
          points_earned: pointsEarned,
          answered_at: new Date().toISOString(),
          time_taken_seconds: question.question_duration_seconds - timeRemaining,
        })
    } catch (error) {
      console.error('Failed to save answer:', error)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Timer and Points */}
      <div className="flex justify-between items-center mb-6">
        <div className="bg-red-500 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-3 transform -rotate-1">
          <p className="text-white font-black text-lg">⏰ {formatTime(timeRemaining)}</p>
        </div>
        <div className="bg-yellow-400 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-3 transform rotate-1">
          <p className="text-black font-black text-lg">💰 {Math.round(currentPoints)} pts</p>
        </div>
      </div>

      {/* Question */}
      <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 mb-6 transform -rotate-1">
        <h2 className="text-2xl font-black text-black text-center mb-4">
          {question.question_text}
        </h2>
      </div>

      {/* Image with Overlay Boxes */}
      {question.image_url && (
        <div className="relative mb-6 max-w-2xl mx-auto">
          <div className="relative aspect-video bg-gray-200 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <Image
              src={question.image_url}
              alt="Question image"
              fill
              className="object-cover"
            />
            
            {/* Overlay Grid */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-1 p-2">
              {Array.from({ length: totalBoxes }, (_, index) => (
                <div
                  key={index}
                  className={`bg-black border-2 border-white transition-opacity duration-500 ${
                    index < revealedBoxes ? 'opacity-0' : 'opacity-90'
                  }`}
                  style={{
                    transitionDelay: `${index * (boxRevealInterval / 1000)}s`
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Answer Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {question.options.map((option, index) => (
          <Button
            key={index}
            onClick={() => handleAnswerSelect(index)}
            disabled={hasAnswered}
            className={`
              p-6 text-lg font-bold border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] 
              hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none 
              transform active:translate-x-[3px] active:translate-y-[3px] 
              transition-all duration-75 h-auto min-h-[80px]
              ${hasAnswered 
                ? selectedAnswer === index
                  ? index === 0 // Assuming first option is correct for demo
                    ? 'bg-green-500 text-white' 
                    : 'bg-red-500 text-white'
                  : index === 0 && showAnswer
                    ? 'bg-green-300 text-black'
                    : 'bg-gray-300 text-gray-600'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
              }
            `}
          >
            <span className="block text-center">{option}</span>
          </Button>
        ))}
      </div>

      {/* Answer Result */}
      {showAnswer && (
        <div className="mt-6 text-center">
          <div className={`
            inline-block p-4 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] 
            transform rotate-1 ${selectedAnswer === 0 ? 'bg-green-300' : 'bg-red-300'}
          `}>
            <p className="text-xl font-black text-black">
              {selectedAnswer === 0 ? '🎉 Correct!' : selectedAnswer === null ? '⏰ Time\'s Up!' : '❌ Wrong Answer!'}
            </p>
            <p className="text-sm font-bold text-gray-700">
              {selectedAnswer === 0 ? `+${Math.round(currentPoints)} points!` : '+0 points'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cva, type VariantProps } from 'class-variance-authority'
import { X, Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

const multiStepFormVariants = cva('flex flex-col', {
  variants: {
    size: {
      default: 'w-full md:w-[760px]',
      sm: 'w-full md:w-[550px]',
      lg: 'w-full md:w-[900px]',
    },
  },
  defaultVariants: {
    size: 'default',
  },
})

interface MultiStepFormProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof multiStepFormVariants> {
  currentStep: number
  totalSteps: number
  title: string
  description: string
  onBack: () => void
  onNext: () => void
  onClose?: () => void
  backButtonText?: string
  nextButtonText?: string
  finishButtonText?: string
  isNextDisabled?: boolean
  isLoading?: boolean
  footerContent?: React.ReactNode
}

export const MultiStepForm = React.forwardRef<HTMLDivElement, MultiStepFormProps>(
  (
    {
      className,
      size,
      currentStep,
      totalSteps,
      title,
      description,
      onBack,
      onNext,
      onClose,
      backButtonText = 'Retour',
      nextButtonText = 'Étape suivante',
      finishButtonText = 'Terminer',
      isNextDisabled = false,
      isLoading = false,
      footerContent,
      children,
      ...props
    },
    ref,
  ) => {
    const progress = Math.round((currentStep / totalSteps) * 100)
    const isLastStep = currentStep === totalSteps

    return (
      <Card
        ref={ref}
        className={cn(multiStepFormVariants({ size }), 'gap-0 py-0', className)}
        {...props}
      >
        <CardHeader className="p-5 pb-4 border-b">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            {onClose && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onClose}
                aria-label="Fermer"
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3 pt-3">
            <Progress value={progress} className="h-1.5 flex-1" />
            <p className="text-xs text-muted-foreground whitespace-nowrap font-medium">
              Étape {currentStep} / {totalSteps}
            </p>
          </div>
        </CardHeader>

        <CardContent className="min-h-[320px] overflow-hidden p-5">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </CardContent>

        <CardFooter className="flex items-center justify-between p-4">
          <div className="text-sm">{footerContent}</div>
          <div className="flex gap-2">
            {currentStep > 1 && (
              <Button variant="outline" onClick={onBack}>
                {backButtonText}
              </Button>
            )}
            <Button onClick={onNext} disabled={isNextDisabled || isLoading}>
              {isLastStep && isLoading ? (
                <><Loader2 className="size-4 animate-spin mr-1.5" />{finishButtonText}</>
              ) : (
                isLastStep ? finishButtonText : nextButtonText
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
    )
  },
)

MultiStepForm.displayName = 'MultiStepForm'

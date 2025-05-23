import React from 'react';

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
};

export function Card({ className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

type CardHeaderProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
};

export function CardHeader({ className = '', children, ...props }: CardHeaderProps) {
  return (
    <div
      className={`p-6 border-b border-gray-200 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

type CardTitleProps = React.HTMLAttributes<HTMLHeadingElement> & {
  children: React.ReactNode;
};

export function CardTitle({ className = '', children, ...props }: CardTitleProps) {
  return (
    <h3
      className={`text-xl font-semibold text-gray-900 ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
}

type CardDescriptionProps = React.HTMLAttributes<HTMLParagraphElement> & {
  children: React.ReactNode;
};

export function CardDescription({ className = '', children, ...props }: CardDescriptionProps) {
  return (
    <p
      className={`mt-1 text-sm text-gray-500 ${className}`}
      {...props}
    >
      {children}
    </p>
  );
}

type CardContentProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
};

export function CardContent({ className = '', children, ...props }: CardContentProps) {
  return (
    <div
      className={`p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

type CardFooterProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
};

export function CardFooter({ className = '', children, ...props }: CardFooterProps) {
  return (
    <div
      className={`p-6 border-t border-gray-200 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
} 
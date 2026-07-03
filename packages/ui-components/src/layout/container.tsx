import React from "react";
import { cn } from "../cn.ts";

interface ContainerProps extends React.PropsWithChildren {
  className?: string;
}

export const Container: React.FC<ContainerProps> = ({
  children,
  className = "",
}) => <div className={cn("container mx-auto px-1", className)}>{children}</div>;

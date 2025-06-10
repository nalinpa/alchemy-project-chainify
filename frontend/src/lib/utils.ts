import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { EthersError } from 'ethers';

export const cn =(...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs))
}


export const isEthersError = (error: any): error is EthersError & { code: string; reason?: string; info?: any; shortMessage?: string } => {
  return error instanceof Error && 
         typeof (error as any).code === 'string' && 
         (error.name === 'EthersError' || Object.prototype.hasOwnProperty.call(error, 'reason') || Object.prototype.hasOwnProperty.call(error, 'info'));
}
import type { ButtonHTMLAttributes, ReactNode } from 'react'
export function IconButton({label,children,className='',...props}:ButtonHTMLAttributes<HTMLButtonElement>&{label:string;children:ReactNode}) {
 return <button type="button" className={'ui-icon-action '+className} aria-label={label} title={label} {...props}>{children}</button>
}

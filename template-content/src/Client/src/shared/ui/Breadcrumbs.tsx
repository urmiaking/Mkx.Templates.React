import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
export type Breadcrumb={label:string;to?:string}
export function Breadcrumbs({items}:{items:readonly Breadcrumb[]}) {
 return <nav className="ui-breadcrumbs" aria-label="مسیر صفحه"><ol>{items.map((item,i)=><li key={item.to??i}>
   {i>0&&<ChevronLeft size={14} aria-hidden="true"/>}
   {item.to?<Link to={item.to}>{item.label}</Link>:<span aria-current="page">{item.label}</span>}
 </li>)}</ol></nav>
}

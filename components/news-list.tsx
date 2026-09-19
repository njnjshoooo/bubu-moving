import {ManagedImage} from './managed-image';
import {readPosts} from '@/lib/content-server';
export async function NewsList(){const news=await readPosts('news');return <div className="news-grid">{news.map(n=><a className="news-card" key={n.id} href={'/news/'+n.id}><div className="news-image"><ManagedImage src={n.image} alt={n.title} loading="lazy"/></div><div className="news-copy"><time dateTime={n.date}>{n.date.replaceAll('-','.')}</time><h3>{n.title}</h3><p>{n.summary}</p><span className="editorial-link">閱讀新訊 ↗</span></div></a>)}</div>}

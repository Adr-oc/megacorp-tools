import { IdeasBoardLoader } from './ideas-board-loader'
import { requireApp } from '@/lib/permissions/require-app'
import { getIdeasBoard } from '@/lib/ideas-board/actions'

export default async function IdeasBoardPage() {
  await requireApp('ideas-board')
  const initialBoard = await getIdeasBoard()

  return <IdeasBoardLoader initialBoard={initialBoard} />
}

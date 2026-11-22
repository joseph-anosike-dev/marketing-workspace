import { localBookmarks } from './local/bookmarks'
import { localItems } from './local/items'
import { localProjects } from './local/projects'
import { localTags } from './local/tags'
import { localTools } from './local/tools'

// The rest of the app imports ONLY from here. To move to Supabase later,
// we add a supabase/ folder with the same repositories and choose
// between them here (for example using VITE_DATA_BACKEND).
export const projectsRepo = localProjects
export const itemsRepo = localItems
export const tagsRepo = localTags
export const toolsRepo = localTools
export const bookmarksRepo = localBookmarks
/**
 * `conversation.message.images` fill: replaces the stock message gallery so
 * every chat image (generated media, `send_media` results, user uploads)
 * gains direct download and save-as actions alongside the inline preview.
 * The component honors the slot's owner contract (`MessageImagesOwnerProps`:
 * images + session-authorized loader + alignment), implemented here without
 * importing other feature plugins' components.
 */
import type { ReactNode } from 'react'
import { MediaGallery, type ImageLoaderLike, type ImageSourceLike } from './media.tsx'

/** Structural view of `MessageImagesOwnerProps` (ui-chat / ui-conversation contract). */
export interface MessageMediaImagesProps {
  images: readonly ImageSourceLike[]
  loadImage: ImageLoaderLike
  align: 'start' | 'end'
  compact?: boolean
  thumbnail?: boolean
}

/** Message image gallery fill. */
export function MessageMediaImages(props: MessageMediaImagesProps): ReactNode {
  return (
    <MediaGallery
      images={props.images}
      loadImage={props.loadImage}
      align={props.align}
      compact={props.compact ?? false}
      thumbnail={props.thumbnail ?? false}
    />
  )
}

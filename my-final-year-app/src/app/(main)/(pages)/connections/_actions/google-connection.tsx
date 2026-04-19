'use server'

import { auth, clerkClient } from '@clerk/nextjs'
import { google } from 'googleapis'

export const getFileMetaData = async () => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.OAUTH2_REDIRECT_URI
  )

  const { userId } = auth()

  if (!userId) {
    return { message: 'User not found' }
  }

  try {
    const clerkResponse = await clerkClient.users.getUserOauthAccessToken(
      userId,
      'oauth_google'
    )

    const tokenData = Array.isArray(clerkResponse)
      ? clerkResponse
      : (clerkResponse as any).data ?? []

    if (!tokenData.length || !tokenData[0]?.token) {
      return { message: 'No Google OAuth token found. Please re-authenticate.' }
    }

    oauth2Client.setCredentials({ access_token: tokenData[0].token })

    const drive = google.drive({ version: 'v3', auth: oauth2Client })
    const response = await drive.files.list()

    return response.data
  } catch (error) {
    console.error('Error fetching Google Drive files:', error)
    return { message: 'Failed to fetch Google Drive files' }
  }
}

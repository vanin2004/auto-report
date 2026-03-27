openapi: 3.0.3
info:
  title: File Service API
  version: 1.0.0
  description: API for managing files with presigned URLs (MinIO/S3 compatible)

paths:
  /files:
    post:
      summary: Initialize file upload
      operationId: createFile
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - filename
                - content_type
                - size
              properties:
                filename:
                  type: string
                content_type:
                  type: string
                size:
                  type: integer
      responses:
        '201':
          description: Upload URL generated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UploadResponse'

    get:
      summary: List files
      operationId: listFiles
      security:
        - bearerAuth: []
      parameters:
        - in: query
          name: limit
          schema:
            type: integer
            default: 20
        - in: query
          name: cursor
          schema:
            type: string
      responses:
        '200':
          description: List of files
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/FileListResponse'

  /files/{id}:
    get:
      summary: Get download URL
      operationId: getDownloadUrl
      security:
        - bearerAuth: []
      parameters:
        - $ref: '#/components/parameters/FileId'
      responses:
        '200':
          description: Presigned download URL
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DownloadResponse'

    delete:
      summary: Delete file
      operationId: deleteFile
      security:
        - bearerAuth: []
      parameters:
        - $ref: '#/components/parameters/FileId'
      responses:
        '204':
          description: File deleted

  /files/{id}/meta:
    get:
      summary: Get file metadata
      operationId: getFileMeta
      security:
        - bearerAuth: []
      parameters:
        - $ref: '#/components/parameters/FileId'
      responses:
        '200':
          description: File metadata
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/File'

  /files/{id}/complete:
    post:
      summary: Confirm upload completion
      operationId: completeUpload
      security:
        - bearerAuth: []
      parameters:
        - $ref: '#/components/parameters/FileId'
      responses:
        '200':
          description: File marked as ready
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    enum: [READY]

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  parameters:
    FileId:
      in: path
      name: id
      required: true
      schema:
        type: string
        format: uuid

  schemas:
    File:
      type: object
      properties:
        id:
          type: string
          format: uuid
        filename:
          type: string
        content_type:
          type: string
        size:
          type: integer
        status:
          type: string
          enum: [UPLOADING, READY, FAILED, DELETED]
        owner_id:
          type: string
        storage_key:
          type: string
        created_at:
          type: string
          format: date-time

    UploadResponse:
      type: object
      properties:
        file_id:
          type: string
          format: uuid
        upload_url:
          type: string
        method:
          type: string
          example: PUT
        headers:
          type: object
          additionalProperties:
            type: string
        expires_in:
          type: integer

    DownloadResponse:
      type: object
      properties:
        file_id:
          type: string
          format: uuid
        download_url:
          type: string
        expires_in:
          type: integer

    FileListResponse:
      type: object
      properties:
        items:
          type: array
          items:
            $ref: '#/components/schemas/File'
        next_cursor:
          type: string
          nullable: true

paths:
  /files/{id}/multipart/init:
    post:
      summary: Initialize multipart upload
      operationId: initMultipartUpload
      security:
        - bearerAuth: []
      parameters:
        - $ref: '#/components/parameters/FileId'
      responses:
        '200':
          description: Multipart upload initialized
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MultipartInitResponse'

  /files/{id}/multipart/parts:
    post:
      summary: Get presigned URLs for parts
      operationId: getMultipartUploadUrls
      security:
        - bearerAuth: []
      parameters:
        - $ref: '#/components/parameters/FileId'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - parts
              properties:
                parts:
                  type: array
                  items:
                    type: integer
                  example: [1, 2, 3]
      responses:
        '200':
          description: Presigned URLs for upload parts
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MultipartUrlsResponse'

  /files/{id}/multipart/complete:
    post:
      summary: Complete multipart upload
      operationId: completeMultipartUpload
      security:
        - bearerAuth: []
      parameters:
        - $ref: '#/components/parameters/FileId'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - parts
              properties:
                parts:
                  type: array
                  items:
                    type: object
                    required:
                      - part_number
                      - etag
                    properties:
                      part_number:
                        type: integer
                      etag:
                        type: string
      responses:
        '200':
          description: Multipart upload completed
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    enum: [READY]

  /files/{id}/permissions:
    get:
      summary: Get file permissions
      operationId: getFilePermissions
      security:
        - bearerAuth: []
      parameters:
        - $ref: '#/components/parameters/FileId'
      responses:
        '200':
          description: File permissions
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PermissionsResponse'

    put:
      summary: Update file permissions
      operationId: updateFilePermissions
      security:
        - bearerAuth: []
      parameters:
        - $ref: '#/components/parameters/FileId'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdatePermissionsRequest'
      responses:
        '200':
          description: Permissions updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PermissionsResponse'
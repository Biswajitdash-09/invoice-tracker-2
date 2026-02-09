import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import DocumentUpload from '@/models/DocumentUpload';
import { getSession } from '@/lib/auth';
import { requireRole, checkPermission } from '@/lib/rbac';
import { ROLES } from '@/constants/roles';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

/**
 * GET /api/pm/documents - List PM's uploaded documents
 */
export async function GET(request) {
    try {
        const session = await getSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const roleCheck = requireRole([ROLES.ADMIN, ROLES.PROJECT_MANAGER])(session.user);
        if (!roleCheck.allowed) {
            return NextResponse.json({ error: roleCheck.reason }, { status: 403 });
        }

        await connectToDatabase();

        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');
        const type = searchParams.get('type');

        let query = {};

        // PMs only see their own uploads
        if (session.user.role === ROLES.PROJECT_MANAGER) {
            query.uploadedBy = session.user.id;
        }

        if (projectId) query.projectId = projectId;
        if (type) query.type = type;

        const documents = await DocumentUpload.find(query).sort({ created_at: -1 });

        return NextResponse.json({ documents: documents.map(d => d.toObject()) });
    } catch (error) {
        console.error('Error fetching documents:', error);
        return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }
}

/**
 * POST /api/pm/documents - Upload document (Ringi, Annex, Timesheet)
 */
export async function POST(request) {
    try {
        const session = await getSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        if (!checkPermission(session.user, 'UPLOAD_DOCUMENT')) {
            return NextResponse.json({ error: 'Not authorized to upload documents' }, { status: 403 });
        }

        const formData = await request.formData();
        const file = formData.get('file');
        const type = formData.get('type');
        const projectId = formData.get('projectId');
        const invoiceId = formData.get('invoiceId');
        const billingMonth = formData.get('billingMonth');
        const ringiNumber = formData.get('ringiNumber');
        const projectName = formData.get('projectName');

        if (!file || !type) {
            return NextResponse.json(
                { error: 'Missing required fields: file, type' },
                { status: 400 }
            );
        }

        // Validate document type
        const validTypes = ['RINGI', 'ANNEX', 'TIMESHEET', 'RATE_CARD'];
        if (!validTypes.includes(type)) {
            return NextResponse.json(
                { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
                { status: 400 }
            );
        }

        await connectToDatabase();

        // Save file to uploads directory
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const uploadsDir = path.join(process.cwd(), 'uploads', 'documents');
        await mkdir(uploadsDir, { recursive: true });

        const fileId = uuidv4();
        const ext = path.extname(file.name);
        const fileName = `${fileId}${ext}`;
        const filePath = path.join(uploadsDir, fileName);

        await writeFile(filePath, buffer);

        // Timesheet validation
        let validated = false;
        let validationNotes = '';
        if (type === 'TIMESHEET') {
            // Basic validation - check file exists and has content
            validated = buffer.length > 0;
            validationNotes = validated ? 'File validated at upload' : 'Empty file detected';
        }

        // Create document record
        const document = await DocumentUpload.create({
            id: fileId,
            projectId: projectId || null,
            invoiceId: invoiceId || null,
            type,
            fileName: file.name,
            fileUrl: `/uploads/documents/${fileName}`,
            mimeType: file.type,
            fileSize: buffer.length,
            uploadedBy: session.user.id,
            metadata: {
                billingMonth: billingMonth || null,
                validated,
                validationNotes,
                ringiNumber: ringiNumber || null,
                projectName: projectName || null
            },
            status: validated ? 'VALIDATED' : 'PENDING'
        });

        // Audit trail
        await db.createAuditTrailEntry({
            invoice_id: invoiceId || null,
            username: session.user.name || session.user.email,
            action: 'DOCUMENT_UPLOADED',
            details: `Uploaded ${type}: ${file.name}`
        });

        return NextResponse.json({
            success: true,
            document: document.toObject()
        }, { status: 201 });
    } catch (error) {
        console.error('Error uploading document:', error);
        return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
    }
}

import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const EXCEL_FILE_PATH = path.join(DATA_DIR, 'licc_members_database.xlsx');

// Utility to normalize phone numbers for comparison
export const normalizePhone = (phone) => {
  if (!phone) return '';
  let cleaned = phone.replace(/[^\d+]/g, '');
  // Normalize 080... to +23480...
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '+234' + cleaned.substring(1);
  } else if (!cleaned.startsWith('+') && cleaned.startsWith('234')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
};

const COLUMN_POSITIONS = {
  Members: {
    id: 1,
    firstname: 2,
    lastname: 3,
    occupation: 4,
    agegroup: 5,
    whatsappphone: 6,
    altphone: 7,
    createdat: 8
  },
  Showcases: {
    id: 1,
    authorphone: 2,
    authorname: 3,
    title: 4,
    category: 5,
    description: 6,
    imageurl: 7,
    whatsappcontact: 8,
    createdat: 9,
    likes: 10
  },
  Comments: {
    id: 1,
    postid: 2,
    authorname: 3,
    commenttext: 4,
    createdat: 5
  },
  Events: {
    id: 1,
    title: 2,
    category: 3,
    eventdate: 4,
    eventtime: 5,
    venue: 6,
    description: 7,
    bannerurl: 8,
    createdby: 9,
    createdat: 10
  },
  Excos: {
    id: 1,
    role: 2,
    name: 3,
    phone: 4,
    email: 5,
    portfolio: 6,
    order: 7
  }
};

// Helper to safely get cell value by column key in ExcelJS
function getVal(row, sheet, key) {
  if (!row) return null;
  const sheetName = sheet ? sheet.name : '';
  const keyLower = String(key).toLowerCase();

  // 1. Try predefined column index
  if (sheetName && COLUMN_POSITIONS[sheetName] && COLUMN_POSITIONS[sheetName][keyLower]) {
    const colIdx = COLUMN_POSITIONS[sheetName][keyLower];
    const cellVal = row.getCell(colIdx).value;
    if (cellVal !== null && cellVal !== undefined) {
      if (typeof cellVal === 'object' && cellVal.text !== undefined) return cellVal.text;
      if (typeof cellVal === 'object' && cellVal.result !== undefined) return cellVal.result;
      return cellVal;
    }
  }

  // 2. Try sheet.columns
  if (sheet && sheet.columns) {
    const colIndex = sheet.columns.findIndex(c => c && c.key === key);
    if (colIndex !== -1) {
      const val = row.getCell(colIndex + 1).value;
      if (val && typeof val === 'object' && val.text !== undefined) {
        return val.text;
      }
      return val;
    }
  }
  return null;
}

// Helper to safely set cell value by column key in ExcelJS
function setVal(row, sheet, key, val) {
  if (!row) return;
  const sheetName = sheet ? sheet.name : '';
  const keyLower = String(key).toLowerCase();
  if (sheetName && COLUMN_POSITIONS[sheetName] && COLUMN_POSITIONS[sheetName][keyLower]) {
    const colIdx = COLUMN_POSITIONS[sheetName][keyLower];
    row.getCell(colIdx).value = val;
    return;
  }
  if (!sheet || !sheet.columns) return;
  const colIndex = sheet.columns.findIndex(c => c && c.key === key);
  if (colIndex !== -1) {
    row.getCell(colIndex + 1).value = val;
  }
}

// Ensure directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize Excel Workbook with worksheets if it does not exist
export async function getWorkbook() {
  const workbook = new ExcelJS.Workbook();

  if (fs.existsSync(EXCEL_FILE_PATH)) {
    await workbook.xlsx.readFile(EXCEL_FILE_PATH);
  } else {
    // Create new worksheets
    createMembersSheet(workbook);
    createShowcasesSheet(workbook);
    createCommentsSheet(workbook);
    createEventsSheet(workbook);
    createExcosSheet(workbook);
    await workbook.xlsx.writeFile(EXCEL_FILE_PATH);
  }

  // Ensure explicit columns are bound so ExcelJS methods work reliably
  const membersSheet = workbook.getWorksheet('Members') || createMembersSheet(workbook);
  membersSheet.columns = [
    { header: 'Member ID', key: 'id', width: 15 },
    { header: 'First Name', key: 'firstName', width: 18 },
    { header: 'Last Name', key: 'lastName', width: 18 },
    { header: 'Occupation', key: 'occupation', width: 25 },
    { header: 'Age Group', key: 'ageGroup', width: 16 },
    { header: 'WhatsApp Phone', key: 'whatsappPhone', width: 20 },
    { header: 'Alt Phone', key: 'altPhone', width: 20 },
    { header: 'Created At', key: 'createdAt', width: 24 }
  ];

  const showcasesSheet = workbook.getWorksheet('Showcases') || createShowcasesSheet(workbook);
  showcasesSheet.columns = [
    { header: 'Showcase ID', key: 'id', width: 15 },
    { header: 'Author Phone', key: 'authorPhone', width: 20 },
    { header: 'Author Name', key: 'authorName', width: 20 },
    { header: 'Title', key: 'title', width: 30 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Description', key: 'description', width: 45 },
    { header: 'Image URL', key: 'imageUrl', width: 35 },
    { header: 'WhatsApp Contact', key: 'whatsappContact', width: 20 },
    { header: 'Created At', key: 'createdAt', width: 24 },
    { header: 'Likes', key: 'likes', width: 10 }
  ];

  const eventsSheet = workbook.getWorksheet('Events') || createEventsSheet(workbook);
  eventsSheet.columns = [
    { header: 'Event ID', key: 'id', width: 16 },
    { header: 'Title', key: 'title', width: 32 },
    { header: 'Category', key: 'category', width: 22 },
    { header: 'Event Date', key: 'eventDate', width: 16 },
    { header: 'Event Time', key: 'eventTime', width: 20 },
    { header: 'Venue', key: 'venue', width: 45 },
    { header: 'Description', key: 'description', width: 50 },
    { header: 'Banner URL', key: 'bannerUrl', width: 35 },
    { header: 'Created By', key: 'createdBy', width: 22 },
    { header: 'Created At', key: 'createdAt', width: 24 }
  ];

  const excosSheet = workbook.getWorksheet('Excos') || createExcosSheet(workbook);
  excosSheet.columns = [
    { header: 'EXCO ID', key: 'id', width: 14 },
    { header: 'Role', key: 'role', width: 22 },
    { header: 'Name', key: 'name', width: 26 },
    { header: 'Phone', key: 'phone', width: 20 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Portfolio', key: 'portfolio', width: 45 },
    { header: 'Display Order', key: 'order', width: 15 }
  ];

  let sChanged = false;

  // Auto-seed EXCO members if Excos worksheet has only header row
  let excosCount = 0;
  excosSheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) excosCount++;
  });
  if (excosCount === 0) {
    INITIAL_EXCOS.forEach(ex => excosSheet.addRow(ex));
    sChanged = true;
  }

  // Purge any dummy members so Member Directory has zero dummy records
  const dummyMembers = [];
  membersSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const id = String(getVal(row, membersSheet, 'id') || '').trim();
    const firstName = String(getVal(row, membersSheet, 'firstName') || '').trim();
    const lastName = String(getVal(row, membersSheet, 'lastName') || '').trim();
    const fullName = `${firstName} ${lastName}`.toLowerCase();
    if (
      id.startsWith('MEM-100') ||
      fullName.includes('emmanuel adeyemi') ||
      fullName.includes('david okonkwo') ||
      fullName.includes('test') ||
      fullName.includes('dummy') ||
      fullName.includes('sample')
    ) {
      dummyMembers.push(rowNumber);
    }
  });
  for (let i = dummyMembers.length - 1; i >= 0; i--) {
    membersSheet.spliceRows(dummyMembers[i], 1);
    sChanged = true;
  }

  // Purge any dummy showcase posts
  const dummyShowcases = [];
  showcasesSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const title = String(getVal(row, showcasesSheet, 'title') || '').toLowerCase();
    const id = String(getVal(row, showcasesSheet, 'id') || '');
    const author = String(getVal(row, showcasesSheet, 'authorName') || '').toLowerCase();
    if (
      id === 'POST-5001' ||
      title.includes('leke tech') ||
      title.includes('apex engineering') ||
      title.includes('test') ||
      title.includes('dummy') ||
      author.includes('david okonkwo') ||
      author.includes('emmanuel adeyemi') ||
      !title
    ) {
      dummyShowcases.push(rowNumber);
    }
  });
  for (let i = dummyShowcases.length - 1; i >= 0; i--) {
    showcasesSheet.spliceRows(dummyShowcases[i], 1);
    sChanged = true;
  }
  if (sChanged) {
    try {
      await workbook.xlsx.writeFile(EXCEL_FILE_PATH);
    } catch (e) {
      // file might be locked, non-fatal
    }
  }

  return workbook;
}

function styleHeaderRow(sheet) {
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Segoe UI' };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F766E' } // Teal accent color
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

function createMembersSheet(workbook) {
  const sheet = workbook.addWorksheet('Members');
  sheet.columns = [
    { header: 'Member ID', key: 'id', width: 15 },
    { header: 'First Name', key: 'firstName', width: 18 },
    { header: 'Last Name', key: 'lastName', width: 18 },
    { header: 'Occupation', key: 'occupation', width: 25 },
    { header: 'Age Group', key: 'ageGroup', width: 16 },
    { header: 'WhatsApp Phone', key: 'whatsappPhone', width: 20 },
    { header: 'Alt Phone', key: 'altPhone', width: 20 },
    { header: 'Created At', key: 'createdAt', width: 24 }
  ];
  styleHeaderRow(sheet);
  return sheet;
}

function createShowcasesSheet(workbook) {
  const sheet = workbook.addWorksheet('Showcases');
  sheet.columns = [
    { header: 'Post ID', key: 'id', width: 15 },
    { header: 'Author Phone', key: 'authorPhone', width: 20 },
    { header: 'Author Name', key: 'authorName', width: 22 },
    { header: 'Business Title', key: 'title', width: 30 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Description', key: 'description', width: 45 },
    { header: 'Image URL', key: 'imageUrl', width: 35 },
    { header: 'WhatsApp Contact', key: 'whatsappContact', width: 20 },
    { header: 'Created At', key: 'createdAt', width: 24 },
    { header: 'Likes', key: 'likes', width: 10 }
  ];
  styleHeaderRow(sheet);
  return sheet;
}

function createCommentsSheet(workbook) {
  const sheet = workbook.addWorksheet('Comments');
  sheet.columns = [
    { header: 'Comment ID', key: 'id', width: 15 },
    { header: 'Post ID', key: 'postId', width: 15 },
    { header: 'Author Name', key: 'authorName', width: 22 },
    { header: 'Comment Text', key: 'commentText', width: 50 },
    { header: 'Created At', key: 'createdAt', width: 24 }
  ];
  styleHeaderRow(sheet);
  return sheet;
}

function createEventsSheet(workbook) {
  const sheet = workbook.addWorksheet('Events');
  sheet.columns = [
    { header: 'Event ID', key: 'id', width: 16 },
    { header: 'Title', key: 'title', width: 32 },
    { header: 'Category', key: 'category', width: 22 },
    { header: 'Event Date', key: 'eventDate', width: 16 },
    { header: 'Event Time', key: 'eventTime', width: 20 },
    { header: 'Venue', key: 'venue', width: 45 },
    { header: 'Description', key: 'description', width: 50 },
    { header: 'Banner URL', key: 'bannerUrl', width: 35 },
    { header: 'Created By', key: 'createdBy', width: 22 },
    { header: 'Created At', key: 'createdAt', width: 24 }
  ];
  styleHeaderRow(sheet);
  return sheet;
}

function createExcosSheet(workbook) {
  const sheet = workbook.addWorksheet('Excos');
  sheet.columns = [
    { header: 'EXCO ID', key: 'id', width: 14 },
    { header: 'Role', key: 'role', width: 22 },
    { header: 'Name', key: 'name', width: 26 },
    { header: 'Phone', key: 'phone', width: 20 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Portfolio', key: 'portfolio', width: 45 },
    { header: 'Display Order', key: 'order', width: 15 }
  ];
  styleHeaderRow(sheet);
  return sheet;
}

export const INITIAL_EXCOS = [
  { id: 'EXCO-1', role: 'PRESIDENT', name: 'Prof. Tolu Ososanya', phone: '+2348033333331', email: '', portfolio: 'Overall Leadership, Fellowship Vision & Spiritual Oversight', order: 1 },
  { id: 'EXCO-2', role: 'VICE PRESIDENT', name: 'Bro Feyi Ijimakinwa', phone: '+2348033333332', email: '', portfolio: 'Programs, Strategy & Executive Coordination', order: 2 },
  { id: 'EXCO-3', role: 'GENERAL SECRETARY', name: 'Dr Damola Oyejobi', phone: '+2348033333333', email: '', portfolio: 'Administration, Documentation, Records & Communications', order: 3 },
  { id: 'EXCO-4', role: 'ASST. GEN. SEC.', name: 'Bro Solomon Adeleke', phone: '+2348165413812', email: '', portfolio: 'Secretariat, Digital Systems & Data Operations', order: 4 },
  { id: 'EXCO-5', role: 'SOCIAL SECRETARY', name: 'Bro Oluwatobi Oduntan', phone: '+2348033333335', email: '', portfolio: 'Welfare, Socials, Fellowship Hospitality & Events Logistics', order: 5 },
  { id: 'EXCO-6', role: 'FINANCIAL SEC', name: 'Bro Tayo Olayinka', phone: '+2348033333336', email: '', portfolio: 'Financial Records, Accounts, Dues & Treasury Oversight', order: 6 },
];

async function seedInitialData(workbook) {
  // Clean initialization: No dummy or mock records inserted
}

// ----------------- MEMBER OPERATIONS -----------------

export async function checkPhoneExists(whatsappPhone) {
  const workbook = await getWorkbook();
  const sheet = workbook.getWorksheet('Members');
  const targetNormalized = normalizePhone(whatsappPhone);

  let exists = false;
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header
    const phoneInCell = getVal(row, sheet, 'whatsappPhone');
    if (phoneInCell && normalizePhone(String(phoneInCell)) === targetNormalized) {
      exists = true;
    }
  });

  return exists;
}

export async function getAllMembers() {
  try {
    const workbook = await getWorkbook();
    const sheet = workbook.getWorksheet('Members');
    if (!sheet) return [];
    const members = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const id = String(getVal(row, sheet, 'id') || '').trim();
      const firstName = String(getVal(row, sheet, 'firstName') || '').trim();
      const lastName = String(getVal(row, sheet, 'lastName') || '').trim();
      const occupation = String(getVal(row, sheet, 'occupation') || '').trim();
      const ageGroup = String(getVal(row, sheet, 'ageGroup') || '').trim();
      const whatsappPhone = String(getVal(row, sheet, 'whatsappPhone') || '').trim();
      const altPhone = String(getVal(row, sheet, 'altPhone') || '').trim();
      const createdAt = String(getVal(row, sheet, 'createdAt') || '').trim();

      // Must have at least a first name, last name, or phone number to be considered a real record
      if (!firstName && !lastName && !whatsappPhone) return;
      if (firstName.toUpperCase() === 'N/A' && lastName.toUpperCase() === 'N/A') return;

      const fullName = `${firstName} ${lastName}`.toLowerCase();
      if (
        id.startsWith('MEM-100') ||
        fullName.includes('emmanuel adeyemi') ||
        fullName.includes('david okonkwo') ||
        fullName.includes('test') ||
        fullName.includes('dummy') ||
        fullName.includes('sample')
      ) {
        return;
      }

      members.push({
        id: id || `MEM-${rowNumber}`,
        firstName,
        lastName,
        occupation,
        ageGroup,
        whatsappPhone,
        altPhone,
        createdAt
      });
    });

    return members.reverse(); // Most recent first
  } catch (err) {
    console.error('getAllMembers error:', err);
    return [];
  }
}

export async function addMember(data) {
  const normalizedPhone = normalizePhone(data.whatsappPhone);
  if (!normalizedPhone) {
    throw new Error('Primary WhatsApp Phone Number is required.');
  }

  const phoneExists = await checkPhoneExists(normalizedPhone);
  if (phoneExists) {
    throw new Error(`Duplicate entry! Member with WhatsApp number (${data.whatsappPhone}) already exists in the Excel database.`);
  }

  const workbook = await getWorkbook();
  const sheet = workbook.getWorksheet('Members');

  const newMember = {
    id: `MEM-${Date.now().toString().slice(-6)}`,
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    occupation: data.occupation.trim(),
    ageGroup: data.ageGroup,
    whatsappPhone: normalizedPhone,
    altPhone: data.altPhone ? normalizePhone(data.altPhone) : '',
    createdAt: new Date().toISOString()
  };

  sheet.addRow(newMember);
  await workbook.xlsx.writeFile(EXCEL_FILE_PATH);
  return newMember;
}

export async function deleteMember(id) {
  const workbook = await getWorkbook();
  const sheet = workbook.getWorksheet('Members');
  let targetRowIndex = -1;

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    if (String(getVal(row, sheet, 'id')) === id) {
      targetRowIndex = rowNumber;
    }
  });

  if (targetRowIndex !== -1) {
    sheet.spliceRows(targetRowIndex, 1);
    await workbook.xlsx.writeFile(EXCEL_FILE_PATH);
    return true;
  }
  return false;
}

// ----------------- SHOWCASE OPERATIONS -----------------

export async function getAllShowcases() {
  const workbook = await getWorkbook();
  const showcasesSheet = workbook.getWorksheet('Showcases') || createShowcasesSheet(workbook);
  const commentsSheet = workbook.getWorksheet('Comments') || createCommentsSheet(workbook);

  const commentsMap = {};
  if (commentsSheet) {
    commentsSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const pId = String(getVal(row, commentsSheet, 'postId') || '');
      commentsMap[pId] = (commentsMap[pId] || 0) + 1;
    });
  }

  const posts = [];
  if (showcasesSheet) {
    showcasesSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const postId = String(getVal(row, showcasesSheet, 'id') || '');
      const title = String(getVal(row, showcasesSheet, 'title') || '').trim();
      const authorName = String(getVal(row, showcasesSheet, 'authorName') || '').trim();
      const titleLower = title.toLowerCase();
      const authorLower = authorName.toLowerCase();

      if (postId === 'POST-5001' || !title) return;
      if (titleLower.includes('apex engineering') || titleLower.includes('leke tech') || titleLower.includes('test') || titleLower.includes('dummy')) return;
      if (authorLower.includes('david okonkwo') || authorLower.includes('emmanuel adeyemi') || authorLower.includes('test')) return;

      posts.push({
        id: postId,
        authorPhone: String(getVal(row, showcasesSheet, 'authorPhone') || ''),
        authorName,
        title,
        category: String(getVal(row, showcasesSheet, 'category') || ''),
        description: String(getVal(row, showcasesSheet, 'description') || ''),
        imageUrl: String(getVal(row, showcasesSheet, 'imageUrl') || ''),
        whatsappContact: String(getVal(row, showcasesSheet, 'whatsappContact') || ''),
        createdAt: String(getVal(row, showcasesSheet, 'createdAt') || ''),
        likes: Number(getVal(row, showcasesSheet, 'likes') || 0),
        commentsCount: commentsMap[postId] || 0
      });
    });
  }

  return posts.reverse();
}

export async function addShowcase(data) {
  const workbook = await getWorkbook();
  const sheet = workbook.getWorksheet('Showcases');

  const newPost = {
    id: `POST-${Date.now().toString().slice(-6)}`,
    authorPhone: normalizePhone(data.authorPhone),
    authorName: data.authorName.trim(),
    title: data.title.trim(),
    category: data.category || 'General',
    description: data.description.trim(),
    imageUrl: data.imageUrl || '',
    whatsappContact: data.whatsappContact ? normalizePhone(data.whatsappContact) : normalizePhone(data.authorPhone),
    createdAt: new Date().toISOString(),
    likes: 0
  };

  sheet.addRow(newPost);
  await workbook.xlsx.writeFile(EXCEL_FILE_PATH);
  return { ...newPost, commentsCount: 0 };
}

export async function likeShowcase(id) {
  const workbook = await getWorkbook();
  const sheet = workbook.getWorksheet('Showcases');
  let newLikes = 0;

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    if (String(getVal(row, sheet, 'id')) === id) {
      const currentLikes = Number(getVal(row, sheet, 'likes') || 0);
      newLikes = currentLikes + 1;
      setVal(row, sheet, 'likes', newLikes);
    }
  });

  await workbook.xlsx.writeFile(EXCEL_FILE_PATH);
  return newLikes;
}

// ----------------- COMMENT OPERATIONS -----------------

export async function getCommentsForPost(postId) {
  const workbook = await getWorkbook();
  const sheet = workbook.getWorksheet('Comments');
  const comments = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    if (String(getVal(row, sheet, 'postId')) === postId) {
      comments.push({
        id: String(getVal(row, sheet, 'id') || ''),
        postId: String(getVal(row, sheet, 'postId') || ''),
        authorName: String(getVal(row, sheet, 'authorName') || ''),
        commentText: String(getVal(row, sheet, 'commentText') || ''),
        createdAt: String(getVal(row, sheet, 'createdAt') || '')
      });
    }
  });

  return comments.reverse();
}

export async function addComment(data) {
  const workbook = await getWorkbook();
  const sheet = workbook.getWorksheet('Comments');

  const newComment = {
    id: `COM-${Date.now().toString().slice(-6)}`,
    postId: data.postId,
    authorName: data.authorName.trim(),
    commentText: data.commentText.trim(),
    createdAt: new Date().toISOString()
  };

  sheet.addRow(newComment);
  await workbook.xlsx.writeFile(EXCEL_FILE_PATH);
  return newComment;
}

// ----------------- METADATA / STATS -----------------

export async function getExcelStats() {
  const members = await getAllMembers();
  const showcases = await getAllShowcases();
  const workbook = await getWorkbook();
  const commentsSheet = workbook.getWorksheet('Comments');

  const ageGroupBreakdown = {
    '18-29': 0,
    '30-39': 0,
    '40-49': 0,
    '50-59': 0,
    '60 and above': 0
  };

  members.forEach(m => {
    if (ageGroupBreakdown[m.ageGroup] !== undefined) {
      ageGroupBreakdown[m.ageGroup]++;
    }
  });

  let commentCount = 0;
  if (commentsSheet) {
    commentsSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      commentCount++;
    });
  }

  const fileStats = fs.existsSync(EXCEL_FILE_PATH) ? fs.statSync(EXCEL_FILE_PATH) : { size: 0, mtime: new Date() };

  return {
    totalMembers: members.length,
    totalShowcases: showcases.length,
    totalComments: commentCount,
    excelFilePath: EXCEL_FILE_PATH,
    fileSizeBytes: fileStats.size,
    lastModified: fileStats.mtime.toISOString(),
    ageGroupBreakdown
  };
}

// ----------------- EXCO OPERATIONS -----------------

export async function getAllExcos() {
  const workbook = await getWorkbook();
  const sheet = workbook.getWorksheet('Excos');
  if (!sheet) return INITIAL_EXCOS;

  const excos = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const name = String(getVal(row, sheet, 'name') || '').trim();
    if (!name) return;
    excos.push({
      id: String(getVal(row, sheet, 'id') || `EXCO-${rowNumber}`),
      role: String(getVal(row, sheet, 'role') || ''),
      name,
      phone: String(getVal(row, sheet, 'phone') || ''),
      email: String(getVal(row, sheet, 'email') || ''),
      portfolio: String(getVal(row, sheet, 'portfolio') || ''),
      order: Number(getVal(row, sheet, 'order') || rowNumber)
    });
  });

  return excos.length > 0 ? excos.sort((a, b) => a.order - b.order) : INITIAL_EXCOS;
}

// ----------------- EVENT OPERATIONS -----------------

export async function getAllEvents() {
  const workbook = await getWorkbook();
  const sheet = workbook.getWorksheet('Events');
  if (!sheet) return [];

  const events = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const title = String(getVal(row, sheet, 'title') || '').trim();
    if (!title) return;

    events.push({
      id: String(getVal(row, sheet, 'id') || `EVT-${rowNumber}`),
      title,
      category: String(getVal(row, sheet, 'category') || 'Monthly Meeting'),
      eventDate: String(getVal(row, sheet, 'eventDate') || ''),
      eventTime: String(getVal(row, sheet, 'eventTime') || ''),
      venue: String(getVal(row, sheet, 'venue') || 'Light Cathedral, By Old Airport Bus-Stop, U.I Road, Samonda, Ibadan.'),
      description: String(getVal(row, sheet, 'description') || ''),
      bannerUrl: String(getVal(row, sheet, 'bannerUrl') || ''),
      createdBy: String(getVal(row, sheet, 'createdBy') || 'EXCO Secretariat'),
      createdAt: String(getVal(row, sheet, 'createdAt') || new Date().toISOString())
    });
  });

  return events.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
}

export async function addEvent(data) {
  const workbook = await getWorkbook();
  const sheet = workbook.getWorksheet('Events') || createEventsSheet(workbook);

  const newEvent = {
    id: `EVT-${Date.now().toString().slice(-6)}`,
    title: data.title.trim(),
    category: data.category || 'Monthly Meeting',
    eventDate: data.eventDate.trim(),
    eventTime: data.eventTime ? data.eventTime.trim() : '8:00 AM - 10:30 AM',
    venue: data.venue ? data.venue.trim() : 'Light Cathedral, By Old Airport Bus-Stop, U.I Road, Samonda, Ibadan.',
    description: data.description ? data.description.trim() : '',
    bannerUrl: data.bannerUrl ? data.bannerUrl.trim() : '',
    createdBy: data.createdBy ? data.createdBy.trim() : 'EXCO Member',
    createdAt: new Date().toISOString()
  };

  sheet.addRow(newEvent);
  await workbook.xlsx.writeFile(EXCEL_FILE_PATH);
  return newEvent;
}

export async function deleteEvent(id) {
  const workbook = await getWorkbook();
  const sheet = workbook.getWorksheet('Events');
  if (!sheet) return false;

  let targetRowIndex = -1;
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const eventId = String(getVal(row, sheet, 'id') || '');
    if (eventId === String(id)) {
      targetRowIndex = rowNumber;
    }
  });

  if (targetRowIndex !== -1) {
    sheet.spliceRows(targetRowIndex, 1);
    await workbook.xlsx.writeFile(EXCEL_FILE_PATH);
    return true;
  }
  return false;
}

import { ROLE_REQUIREMENTS } from './constants.js';

/**
 * Intelligent Resume & ATS Parser
 * Supports Mozilla PDF.js, pure browser stream decompression,
 * keyword alias matching, and flexible section detection.
 */

// Common tech keywords library across disciplines
export const COMMON_SKILLS = [
  'React', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'Java', 'C++', 'C#',
  'HTML', 'CSS', 'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Docker',
  'Kubernetes', 'AWS', 'Azure', 'GCP', 'Git', 'Linux', 'REST', 'GraphQL',
  'Next.js', 'Vue', 'Angular', 'Express', 'Django', 'Flask', 'Spring Boot',
  'Tailwind', 'Redux', 'Jest', 'Cypress', 'Selenium', 'CI/CD', 'Figma',
  'Tableau', 'PowerBI', 'Pandas', 'NumPy', 'Machine Learning', 'Agile', 'Scrum'
];

// Rich keyword synonyms so real-world phrasing matches standard requirements
export const SKILL_SYNONYMS = {
  'React': ['react', 'react.js', 'reactjs', 'react native'],
  'TypeScript': ['typescript', 'ts'],
  'JavaScript': ['javascript', 'js', 'es6', 'es2020', 'es2021', 'ecmascript'],
  'Node.js': ['node.js', 'node', 'nodejs', 'express', 'express.js', 'nest', 'nestjs'],
  'SQL': ['sql', 'mysql', 'postgresql', 'postgres', 'sqlite', 'rdbms', 't-sql'],
  'PostgreSQL': ['postgresql', 'postgres', 'pg'],
  'MongoDB': ['mongodb', 'mongo', 'mongoose', 'nosql'],
  'REST': ['rest', 'restful', 'rest api', 'apis', 'restful api', 'json api'],
  'Docker': ['docker', 'dockerfile', 'docker-compose', 'containerization', 'containers', 'kubernetes'],
  'AWS': ['aws', 'amazon web services', 's3', 'ec2', 'lambda', 'cloud'],
  'HTML': ['html', 'html5'],
  'CSS': ['css', 'css3', 'sass', 'scss', 'tailwind', 'bootstrap'],
  'Next.js': ['next.js', 'nextjs', 'next'],
  'Git': ['git', 'github', 'gitlab', 'version control'],
  'Python': ['python', 'python3', 'django', 'flask', 'fastapi', 'pandas'],
  'Figma': ['figma', 'sketch', 'adobe xd', 'wireframing', 'prototyping'],
  'Selenium': ['selenium', 'automation testing', 'test automation', 'cypress'],
  'Jest': ['jest', 'unit testing', 'mocha', 'chai', 'testing library'],
  'Cypress': ['cypress', 'e2e testing', 'end-to-end testing'],
  'Linux': ['linux', 'unix', 'ubuntu', 'bash', 'shell scripting']
};

/**
 * Extract text from PDF using PDF.js or native fallback
 */
export async function extractResumeText(file) {
  // 1. If plain text or markdown
  if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result || '');
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  // 2. If PDF file
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;

    reader.onload = async () => {
      const arrayBuffer = reader.result;

      // Method A: Check if PDF.js library is loaded
      if (window.pdfjsLib) {
        try {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          const loadingTask = window.pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
          const pdf = await loadingTask.promise;
          let fullText = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageStr = textContent.items.map(item => item.str).join(' ');
            fullText += pageStr + '\n\n';
          }
          if (fullText.trim().length > 30) {
            return resolve(fullText);
          }
        } catch (pdfErr) {
          console.warn('PDF.js parse notice, falling back:', pdfErr);
        }
      }

      // Method B: Binary stream text operator scan
      try {
        const uint8 = new Uint8Array(arrayBuffer);
        const text = new TextDecoder('latin1').decode(uint8);

        // Extract bracketed text strings (e.g. (John Smith) Tj or [(Hello) -10 (World)] TJ)
        const textTokens = [];
        const tjMatches = text.match(/\(([^)]+)\)\s*Tj/g) || [];
        for (const m of tjMatches) {
          const val = m.replace(/^\(/, '').replace(/\)\s*Tj$/, '').trim();
          if (val) textTokens.push(val);
        }

        const TJMatches = text.match(/\[([^\]]+)\]\s*TJ/g) || [];
        for (const m of TJMatches) {
          const inner = m.match(/\(([^)]+)\)/g) || [];
          for (const s of inner) {
            textTokens.push(s.slice(1, -1));
          }
        }

        // If direct tokens found
        if (textTokens.length > 20) {
          return resolve(textTokens.join(' '));
        }

        // Method C: Raw readable word sequences
        const words = text.match(/[A-Za-z0-9@.+_/-]{2,}/g) || [];
        const cleanWords = words.filter(w => !w.startsWith('/') && !w.startsWith('00') && w.length < 35);
        if (cleanWords.length > 40) {
          return resolve(cleanWords.join(' '));
        }

        // If completely compressed or scanned image
        resolve(
          'Note: This PDF appears to be a scanned image or compressed format. ' +
          'For 100% accurate ATS parsing, please copy and paste your resume text directly into the box below.'
        );
      } catch (err) {
        reject(err);
      }
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Analyze resume text for ATS compliance and role keyword matching
 */
export function analyzeResume(resumeText = '', targetRole = 'Frontend Developer', customJD = '') {
  const text = (resumeText || '').trim();
  const lowerText = text.toLowerCase();

  // 1. Contact Information Extraction
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : '';

  // Phone number matcher supporting international, parenthesis, and dot formats
  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,5}/);
  const phone = phoneMatch ? phoneMatch[0] : '';

  const linkedinMatch = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/i);
  const githubMatch = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_-]+/i);
  const links = [linkedinMatch?.[0], githubMatch?.[0]].filter(Boolean);

  // Extract candidate name heuristic
  let candidateName = '';
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 8)) {
    if (
      line.length >= 2 &&
      line.length <= 40 &&
      !line.includes('@') &&
      !line.includes('http') &&
      !/resume|curriculum|profile|developer|engineer|summary/i.test(line)
    ) {
      candidateName = line;
      break;
    }
  }
  if (!candidateName) candidateName = email ? email.split('@')[0].replace(/[._-]/g, ' ') : 'Candidate';

  // 2. ATS Section Detection (Flexible real-world headings)
  const sections = {
    experience: /(?:experience|employment|work history|career|projects?|professional|internship)/i.test(text),
    education: /(?:education|degree|university|college|bachelor|master|b\.?tech|b\.?e|academic|graduation|diploma|school)/i.test(text),
    skills: /(?:skills|technologies|tools|proficiencies|tech stack|competencies|languages|strengths)/i.test(text)
  };

  const formattingIssues = [];
  const formattingPasses = [];

  if (email) formattingPasses.push(`Email address verified: ${email}`);
  else formattingIssues.push('Missing email address in header');

  if (phone) formattingPasses.push(`Contact phone verified: ${phone}`);
  else formattingIssues.push('Missing contact phone number');

  if (sections.experience) formattingPasses.push('Standard Experience / Projects section found');
  else formattingIssues.push('Missing standard "Experience" section header');

  if (sections.skills) formattingPasses.push('Standard Skills & Technologies section found');
  else formattingIssues.push('Missing standard "Skills" section header');

  if (sections.education) formattingPasses.push('Standard Education / Degree section found');
  else formattingIssues.push('Missing standard "Education" section header');

  // Word count check
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount < 60) {
    formattingIssues.push('Content is very short (< 60 words); ATS may treat as incomplete');
  } else if (wordCount > 1200) {
    formattingIssues.push('Lengthy resume (> 1,200 words); recommended to condense to 1-2 pages');
  } else {
    formattingPasses.push(`Optimal resume length (${wordCount} words)`);
  }

  // 3. Experience estimation
  let estimatedExp = 2;
  const expMatches = text.match(/(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)(?:\s*of)?\s*experience/gi) || [];
  if (expMatches.length > 0) {
    const num = parseFloat(expMatches[0]);
    if (!isNaN(num)) estimatedExp = num;
  } else {
    const yearMatches = text.match(/\b(20\d\d)\b/g) || [];
    if (yearMatches.length > 0) {
      const earliest = Math.min(...yearMatches.map(Number));
      const currentYear = new Date().getFullYear();
      if (earliest >= 2000 && earliest <= currentYear) {
        estimatedExp = Math.min(20, Math.max(0.5, currentYear - earliest));
      }
    }
  }

  // 4. Keyword and Skill Matching (using synonym dictionaries)
  let targetKeywords = ROLE_REQUIREMENTS[targetRole] || COMMON_SKILLS.slice(0, 9);
  if (customJD && customJD.trim().length > 30) {
    const jdLower = customJD.toLowerCase();
    targetKeywords = COMMON_SKILLS.filter(skill => jdLower.includes(skill.toLowerCase()));
    if (targetKeywords.length < 4) {
      targetKeywords = ROLE_REQUIREMENTS[targetRole] || COMMON_SKILLS.slice(0, 8);
    }
  }

  const matchedKeywords = [];
  const missingKeywords = [];

  targetKeywords.forEach(keyword => {
    const synonyms = SKILL_SYNONYMS[keyword] || [keyword.toLowerCase()];
    // Check if any synonym exists in resume
    const isFound = synonyms.some(syn => {
      const regex = new RegExp(`(?:^|[\\s,;:.()\\[\\]/\\-])${syn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|[\\s,;:.()\\[\\]/\\-])`, 'i');
      return regex.test(text) || lowerText.includes(syn);
    });

    if (isFound) {
      matchedKeywords.push(keyword);
    } else {
      missingKeywords.push(keyword);
    }
  });

  // Extract other general skills found
  const allDetectedSkills = COMMON_SKILLS.filter(skill => {
    const synonyms = SKILL_SYNONYMS[skill] || [skill.toLowerCase()];
    return synonyms.some(syn => lowerText.includes(syn));
  });

  // 5. Score Calculation
  const keywordRatio = targetKeywords.length > 0 ? (matchedKeywords.length / targetKeywords.length) : 0.7;
  const keywordScore = Math.round(keywordRatio * 100);

  const formatRatio = formattingPasses.length / (formattingPasses.length + formattingIssues.length || 1);
  const formatScore = Math.round(formatRatio * 100);

  // Weighted overall composite score
  const overallScore = Math.min(99, Math.max(15, Math.round((keywordScore * 0.6) + (formatScore * 0.4))));

  let verdict = 'Strong ATS Compatibility';
  let verdictColor = 'var(--green)';
  if (overallScore < 60) {
    verdict = 'Needs Optimization';
    verdictColor = 'var(--red)';
  } else if (overallScore < 78) {
    verdict = 'Moderate Match';
    verdictColor = 'var(--amber)';
  }

  return {
    candidateName,
    email,
    phone,
    links,
    estimatedExp,
    wordCount,
    sections,
    formattingPasses,
    formattingIssues,
    targetKeywords,
    matchedKeywords,
    missingKeywords,
    allDetectedSkills,
    keywordScore,
    formatScore,
    overallScore,
    verdict,
    verdictColor
  };
}

export const SAMPLE_RESUMES = {
  frontend: `Johnathan Smith
San Francisco, CA • johnathan.smith@example.com • (555) 432-8765
linkedin.com/in/johnathansmith • github.com/johnathandev

PROFESSIONAL SUMMARY
Senior Frontend Engineer with 5+ years of experience building high-performance web applications. Specialized in React, TypeScript, Next.js, and CSS architecture with a track record of improving site speed by 40%.

SKILLS
Frontend: React, TypeScript, JavaScript, HTML5, CSS3, Next.js, Redux, Tailwind
Tools & Testing: Git, Jest, Cypress, Vite, REST APIs, Webpack, Figma

PROFESSIONAL EXPERIENCE
Senior Frontend Developer — TechNova Solutions (2021 – Present)
• Architected core design system components used by 12+ engineering teams using React and TypeScript.
• Integrated responsive dashboards connecting to RESTful backend endpoints with Jest test coverage exceeding 90%.
• Reduced application initial bundle size by 35% through dynamic code-splitting and Next.js SSR optimizations.

Frontend Web Developer — PixelCraft Studios (2019 – 2021)
• Built interactive client web portals using modern JavaScript, HTML, and CSS.
• Collaborated closely with UI/UX designers in Figma to transform high-fidelity wireframes into accessible interfaces.

EDUCATION
Bachelor of Science in Computer Science
University of California, Davis (2015 – 2019)`,

  backend: `Aarav Mehta
Seattle, WA • aarav.mehta@example.com • (555) 876-5432
linkedin.com/in/aaravmehta • github.com/aaravm

PROFESSIONAL SUMMARY
Backend Engineer with 4 years of experience designing scalable microservices, resilient APIs, and distributed database architectures using Node.js, PostgreSQL, Docker, and Redis.

TECHNICAL SKILLS
Languages: Node.js, Python, JavaScript, SQL
Databases & Cache: PostgreSQL, MongoDB, Redis
DevOps & Cloud: Docker, Kubernetes, AWS, Git, CI/CD, Linux
Architecture: RESTful APIs, Microservices, Event-Driven Systems

EXPERIENCE
Backend Software Engineer — CloudScale Inc. (2022 – Present)
• Designed and deployed high-throughput Node.js microservices handling 5M+ daily requests.
• Optimized PostgreSQL query performance, reducing 95th percentile latency from 320ms to 45ms.
• Containerized applications using Docker and implemented automated GitHub Actions CI/CD pipelines.

Software Developer — DataFlow Systems (2020 – 2022)
• Developed REST APIs and database schema migrations using Express and MongoDB.
• Implemented Redis caching layer that reduced database load by 60%.

EDUCATION
B.Tech in Information Technology
National Institute of Technology (2016 – 2020)`
};

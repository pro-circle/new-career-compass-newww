import type { ResumeContent } from "./resume.functions";

function fileStem(name: string) {
  return (name || "resume")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "resume";
}

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export async function downloadResumeDocx(content: ResumeContent) {
  const {
    AlignmentType,
    BorderStyle,
    Document,
    HeadingLevel,
    LevelFormat,
    Packer,
    Paragraph,
    TabStopPosition,
    TabStopType,
    TextRun,
  } = await import("docx");

  const children: InstanceType<typeof Paragraph>[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: content.fullName || "Resume", bold: true, size: 34 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: [content.headline, content.location, content.email].filter(Boolean).join("  |  "),
          size: 20,
          color: "4B5563",
        }),
      ],
    }),
  ];

  const heading = (text: string) =>
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 180, after: 80 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "16A34A", space: 4 } },
      children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 21 })],
    });

  if (content.summary) {
    children.push(heading("Summary"));
    children.push(new Paragraph({ spacing: { after: 100 }, children: [new TextRun(content.summary)] }));
  }

  if (content.experience.length) {
    children.push(heading("Experience"));
    content.experience.forEach((role) => {
      children.push(
        new Paragraph({
          spacing: { before: 100, after: 40 },
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          children: [
            new TextRun({ text: [role.title, role.company].filter(Boolean).join(" — "), bold: true }),
            new TextRun({ text: `\t${role.dates}`, color: "4B5563" }),
          ],
        }),
      );
      role.bullets.forEach((bullet) =>
        children.push(
          new Paragraph({
            numbering: { reference: "resume-bullets", level: 0 },
            spacing: { after: 35 },
            children: [new TextRun(bullet)],
          }),
        ),
      );
    });
  }

  if (content.education.length) {
    children.push(heading("Education"));
    content.education.forEach((item) =>
      children.push(
        new Paragraph({
          spacing: { before: 80, after: 40 },
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          children: [
            new TextRun({ text: [item.degree, item.school].filter(Boolean).join(" — "), bold: true }),
            new TextRun({ text: `\t${item.dates}`, color: "4B5563" }),
          ],
        }),
      ),
    );
  }

  if (content.skills.length) {
    children.push(heading("Skills"));
    children.push(new Paragraph({ children: [new TextRun(content.skills.join(", "))] }));
  }

  const document = new Document({
    styles: {
      default: { document: { run: { font: "Arial", size: 22, color: "111827" } } },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font: "Arial", size: 21, bold: true, color: "111827" },
          paragraph: { outlineLevel: 0 },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: "resume-bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 420, hanging: 220 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12_240, height: 15_840 },
            margin: { top: 900, right: 1_080, bottom: 900, left: 1_080 },
          },
        },
        children,
      },
    ],
  });

  saveBlob(await Packer.toBlob(document), `${fileStem(content.fullName)}.docx`);
}

export async function downloadResumePdf(content: ResumeContent) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "letter" });
  const left = 54;
  const right = 558;
  const bottom = 738;
  let y = 56;

  const ensureSpace = (height: number) => {
    if (y + height <= bottom) return;
    pdf.addPage();
    y = 54;
  };
  const lines = (text: string, width = right - left) => pdf.splitTextToSize(text, width) as string[];
  const paragraph = (text: string, size = 10, indent = 0) => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(size);
    const wrapped = lines(text, right - left - indent);
    ensureSpace(wrapped.length * (size + 3) + 6);
    pdf.text(wrapped, left + indent, y);
    y += wrapped.length * (size + 3) + 6;
  };
  const section = (title: string) => {
    ensureSpace(32);
    y += 10;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(title.toUpperCase(), left, y);
    y += 5;
    pdf.setDrawColor(22, 163, 74);
    pdf.setLineWidth(1);
    pdf.line(left, y, right, y);
    y += 15;
  };

  pdf.setProperties({ title: `${content.fullName || "Candidate"} Resume`, author: content.fullName });
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.text(content.fullName || "Resume", 306, y, { align: "center" });
  y += 18;
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(75, 85, 99);
  pdf.setFontSize(9);
  pdf.text(
    lines([content.headline, content.location, content.email].filter(Boolean).join("  |  "), 500),
    306,
    y,
    { align: "center" },
  );
  y += 22;
  pdf.setTextColor(17, 24, 39);

  if (content.summary) {
    section("Summary");
    paragraph(content.summary);
  }
  if (content.experience.length) {
    section("Experience");
    content.experience.forEach((role) => {
      ensureSpace(36);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text([role.title, role.company].filter(Boolean).join(" — "), left, y);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(75, 85, 99);
      pdf.text(role.dates, right, y, { align: "right" });
      pdf.setTextColor(17, 24, 39);
      y += 15;
      role.bullets.forEach((bullet) => {
        const wrapped = lines(bullet, right - left - 20);
        ensureSpace(wrapped.length * 13 + 4);
        pdf.text("•", left + 4, y);
        pdf.text(wrapped, left + 18, y);
        y += wrapped.length * 13 + 4;
      });
      y += 3;
    });
  }
  if (content.education.length) {
    section("Education");
    content.education.forEach((item) => {
      ensureSpace(24);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text([item.degree, item.school].filter(Boolean).join(" — "), left, y);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(75, 85, 99);
      pdf.text(item.dates, right, y, { align: "right" });
      pdf.setTextColor(17, 24, 39);
      y += 18;
    });
  }
  if (content.skills.length) {
    section("Skills");
    paragraph(content.skills.join(", "));
  }

  pdf.save(`${fileStem(content.fullName)}.pdf`);
}
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getReportById, getOrganizationMember } from "@/lib/enterprise";
import { scoreToGrade } from "@/types/enterprise";
import type { DimensionScores } from "@/types/enterprise";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import React from "react";

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: "Helvetica",
    fontSize: 11,
    color: "#1a1a1a",
  },
  header: {
    marginBottom: 32,
    borderBottomWidth: 2,
    borderBottomColor: "#2563eb",
    paddingBottom: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#1e3a8a",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: "#374151",
    marginBottom: 4,
  },
  meta: {
    fontSize: 10,
    color: "#6b7280",
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#1e3a8a",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#dbeafe",
    paddingBottom: 4,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  scoreLabel: {
    flex: 1,
    fontSize: 11,
    color: "#374151",
  },
  scoreValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1e40af",
    width: 60,
    textAlign: "right",
  },
  scoreBar: {
    height: 6,
    backgroundColor: "#dbeafe",
    borderRadius: 3,
    marginBottom: 10,
    marginLeft: 0,
  },
  scoreBarFill: {
    height: 6,
    backgroundColor: "#2563eb",
    borderRadius: 3,
  },
  overallBox: {
    backgroundColor: "#eff6ff",
    borderRadius: 6,
    padding: 16,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  overallLabel: {
    fontSize: 13,
    color: "#374151",
  },
  overallScore: {
    fontSize: 32,
    fontFamily: "Helvetica-Bold",
    color: "#1e40af",
  },
  overallGrade: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: "#2563eb",
    marginLeft: 12,
  },
  narrativeText: {
    fontSize: 10,
    color: "#374151",
    lineHeight: 1.6,
  },
  recommendationItem: {
    flexDirection: "row",
    marginBottom: 8,
    paddingLeft: 4,
  },
  bullet: {
    fontSize: 11,
    color: "#2563eb",
    marginRight: 8,
    fontFamily: "Helvetica-Bold",
  },
  recommendationText: {
    flex: 1,
    fontSize: 10,
    color: "#374151",
    lineHeight: 1.5,
  },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 48,
    right: 48,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 9,
    color: "#9ca3af",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    paddingVertical: 6,
  },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#dbeafe",
    paddingVertical: 6,
    backgroundColor: "#eff6ff",
  },
  tableCell: {
    flex: 1,
    fontSize: 10,
    color: "#374151",
    paddingHorizontal: 6,
  },
  tableCellBold: {
    flex: 1,
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#1e40af",
    paddingHorizontal: 6,
  },
});

type Report = NonNullable<Awaited<ReturnType<typeof getReportById>>>;

function ReportPDF({ report }: { report: Report }) {
  const dimensionScores = report.dimensionScores as DimensionScores;
  const recommendations = report.recommendations as string[] | null;
  const grade = scoreToGrade(report.overallScore);
  const generatedDate = new Date(report.generatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const dimensions = [
    { label: "AI Awareness", key: "aiAwareness" as const },
    { label: "AI Tool Usage", key: "aiUsage" as const },
    { label: "Process Automation", key: "processAutomation" as const },
    { label: "Learning Willingness", key: "learningWillingness" as const },
  ];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>AI Transformation Diagnostic Report</Text>
          <Text style={styles.subtitle}>{report.organization.name}</Text>
          <Text style={styles.meta}>Generated: {generatedDate}</Text>
          {report.survey?.title && (
            <Text style={styles.meta}>Survey: {report.survey.title}</Text>
          )}
        </View>

        {/* Overall Score */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overall Assessment</Text>
          <View style={styles.overallBox}>
            <Text style={styles.overallLabel}>Overall Score</Text>
            <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
              <Text style={styles.overallScore}>{Math.round(report.overallScore)}</Text>
              <Text style={styles.overallGrade}>{grade}</Text>
            </View>
          </View>
        </View>

        {/* Dimension Scores */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dimension Scores</Text>
          {/* Table Header */}
          <View style={styles.tableHeaderRow}>
            <Text style={styles.tableCellBold}>Dimension</Text>
            <Text style={[styles.tableCellBold, { flex: 0.5, textAlign: "right" }]}>Score</Text>
            <Text style={[styles.tableCellBold, { flex: 0.5, textAlign: "right" }]}>Grade</Text>
          </View>
          {/* Table Rows */}
          {dimensions.map((dim) => (
            <View key={dim.key} style={styles.tableRow}>
              <Text style={styles.tableCell}>{dim.label}</Text>
              <Text style={[styles.tableCell, { flex: 0.5, textAlign: "right" }]}>
                {Math.round(dimensionScores[dim.key])}
              </Text>
              <Text style={[styles.tableCell, { flex: 0.5, textAlign: "right" }]}>
                {scoreToGrade(dimensionScores[dim.key])}
              </Text>
            </View>
          ))}
        </View>

        {/* AI Narrative */}
        {report.aiNarrative && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI Analysis</Text>
            <Text style={styles.narrativeText}>{report.aiNarrative}</Text>
          </View>
        )}

        {/* Recommendations */}
        {recommendations && recommendations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recommendations</Text>
            {recommendations.map((rec, idx) => (
              <View key={idx} style={styles.recommendationItem}>
                <Text style={styles.bullet}>{idx + 1}.</Text>
                <Text style={styles.recommendationText}>{rec}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>AI In Action — Diagnostic Report</Text>
          <Text style={styles.footerText}>
            {report.organization.name} · {generatedDate}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Auth check
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Get report
  const { id } = await params;
  const report = await getReportById(id);
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  // 3. Verify user is a member of the organization
  const member = await getOrganizationMember(report.organizationId, session.user.id);
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 4. Generate PDF
  const buffer = await renderToBuffer(<ReportPDF report={report} />);
  const uint8 = new Uint8Array(buffer);

  // 5. Return PDF response
  return new NextResponse(uint8, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="report-${report.id}.pdf"`,
    },
  });
}

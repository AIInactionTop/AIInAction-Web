"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold, Italic, Strikethrough, List, ListOrdered, Quote,
  Undo, Redo, Link as LinkIcon, Heading2, Heading3,
  Code, Minus, Image as ImageIcon, Save,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { updateEmailTemplate } from "@/actions/admin/email-templates";

type Props = {
  template: {
    id: string;
    name: string;
    subject: string;
    content: Record<string, unknown>;
    htmlContent: string | null;
    variables: string[];
    status: string;
  };
};

function ToolbarButton({
  onClick, active, disabled, children, title,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded p-1.5 transition-colors ${
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      } disabled:opacity-30`}
    >
      {children}
    </button>
  );
}

const AVAILABLE_VARIABLES = [
  { key: "userName", label: "User Name" },
  { key: "userEmail", label: "User Email" },
  { key: "siteUrl", label: "Site URL" },
];

export function EmailTemplateEditor({ template }: Props) {
  const [name, setName] = useState(template.name);
  const [subject, setSubject] = useState(template.subject);
  const [isSaving, startSaving] = useTransition();
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nameRef = useRef(name);
  const subjectRef = useRef(subject);
  useEffect(() => { nameRef.current = name; }, [name]);
  useEffect(() => { subjectRef.current = subject; }, [subject]);

  const triggerSave = useCallback(
    (editorHtml?: string, editorJson?: Record<string, unknown>) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        startSaving(async () => {
          const data: Parameters<typeof updateEmailTemplate>[1] = {};
          data.name = nameRef.current;
          data.subject = subjectRef.current;
          if (editorJson) data.content = editorJson;
          if (editorHtml) data.htmlContent = editorHtml;
          await updateEmailTemplate(template.id, data);
          setLastSaved(new Date());
        });
      }, 2000);
    },
    [template.id]
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline" },
      }),
      ImageExtension,
      Placeholder.configure({ placeholder: "Write your email content here..." }),
    ],
    content: template.content as Record<string, unknown>,
    onUpdate: ({ editor: e }) => {
      triggerSave(e.getHTML(), e.getJSON() as Record<string, unknown>);
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none min-h-[300px] px-4 py-3 focus:outline-none",
      },
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("Image URL");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const insertVariable = useCallback(
    (varKey: string) => {
      if (!editor) return;
      editor.chain().focus().insertContent(`{{${varKey}}}`).run();
    },
    [editor]
  );

  const handleManualSave = () => {
    if (!editor) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    startSaving(async () => {
      await updateEmailTemplate(template.id, {
        name,
        subject,
        content: editor.getJSON() as Record<string, unknown>,
        htmlContent: editor.getHTML(),
      });
      setLastSaved(new Date());
    });
  };

  if (!editor) return null;

  const iconSize = "h-4 w-4";

  return (
    <div className="space-y-4">
      {/* Header with save */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Template</h1>
        <div className="flex items-center gap-3">
          {lastSaved && (
            <span className="text-xs text-muted-foreground">
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          {isSaving && (
            <span className="text-xs text-muted-foreground">Saving...</span>
          )}
          <Button onClick={handleManualSave} disabled={isSaving} size="sm">
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
        </div>
      </div>

      {/* Name & Subject */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Template Name</label>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              triggerSave();
            }}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Email Subject</label>
          <Input
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              triggerSave();
            }}
          />
        </div>
      </div>

      {/* Editor + Variables Panel */}
      <div className="flex gap-4">
        {/* Editor */}
        <div className="flex-1 rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-0.5 border-b border-input px-2 py-1.5">
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Heading 2">
              <Heading2 className={iconSize} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Heading 3">
              <Heading3 className={iconSize} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
              <Bold className={iconSize} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
              <Italic className={iconSize} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough">
              <Strikethrough className={iconSize} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Inline Code">
              <Code className={iconSize} />
            </ToolbarButton>

            <div className="mx-1 h-5 w-px bg-border" />

            <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet List">
              <List className={iconSize} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Ordered List">
              <ListOrdered className={iconSize} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Blockquote">
              <Quote className={iconSize} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
              <Minus className={iconSize} />
            </ToolbarButton>

            <div className="mx-1 h-5 w-px bg-border" />

            <ToolbarButton onClick={setLink} active={editor.isActive("link")} title="Link">
              <LinkIcon className={iconSize} />
            </ToolbarButton>
            <ToolbarButton onClick={addImage} title="Image">
              <ImageIcon className={iconSize} />
            </ToolbarButton>

            <div className="mx-1 h-5 w-px bg-border" />

            <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
              <Undo className={iconSize} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
              <Redo className={iconSize} />
            </ToolbarButton>
          </div>

          <EditorContent editor={editor} />
        </div>

        {/* Variables Panel */}
        <Card className="w-48 shrink-0">
          <CardContent className="p-3">
            <p className="mb-2 text-sm font-medium">Variables</p>
            <p className="mb-3 text-xs text-muted-foreground">
              Click to insert at cursor position
            </p>
            <div className="space-y-1.5">
              {AVAILABLE_VARIABLES.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => insertVariable(v.key)}
                  className="block w-full rounded px-2 py-1 text-left text-xs transition-colors hover:bg-muted"
                >
                  <Badge variant="outline" className="font-mono text-xs">
                    {`{{${v.key}}}`}
                  </Badge>
                  <span className="ml-1 text-muted-foreground">{v.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

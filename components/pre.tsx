"use client";
import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock";
import { useRef } from "react";

// @ts-ignore
export const pre = ({ ref: _ref, title, ...props }) => {
  const ref = useRef<HTMLDivElement | null>(null);

  const run = () => {
    const oldConsoleLog = console.log;
    const oldConsoleError = console.error;

    if (ref.current) ref.current.innerHTML = "";

    console.log = (...args) => {
      if (!ref?.current) return;
      ref.current.innerHTML += args.map(argToHtml()).join("");
    };
    console.error = (...args) => {
      if (!ref?.current) return;
      ref.current.innerHTML += args
        .map(argToHtml("text-red-900 bg-red-100 text-red-50 dark:bg-red-950"))
        .join("");
    };

    const uuid = crypto?.randomUUID() ?? "uuid";
    document.addEventListener(`scriptExecuted-${uuid}`, () => {
      console.log = oldConsoleLog;
      console.error = oldConsoleError;
      document.head.removeChild(script);
    });

    const innerText = extractInnerText({ props });
    const importStatements =
      innerText.match(IMPORT_LINES_REGEX)?.join("\n") || "";
    const code = innerText.replace(IMPORT_LINES_REGEX, "");

    console.log("code", code);

    const script = document.createElement("script");
    script.setAttribute("type", "module");
    script.innerHTML = `
      ${importStatements};
      try {
        ${code};
      } catch(e) {
        console.error(e);
      }
      document.dispatchEvent(new CustomEvent('scriptExecuted-${uuid}'));
    `;
    document.head.appendChild(script);
  };

  return (
    <div className="m-0 p-0">
      <CodeBlock title={title}>
        <Pre {...props} />
      </CodeBlock>
      <button
        onClick={run}
        className="relative -top-4 bg-blue-500 text-white px-3 py-1 rounded-md"
      >
        Run
      </button>
      <div className="relative -top-8" ref={ref} />
      <code>{JSON.stringify({ props })}</code>
      <code>{extractInnerText({ props })}</code>
    </div>
  );
};

const IMPORT_LINES_REGEX =
  /^import\s*(?:(?:(?:[\w*\s{},]*)\s*from)?\s*['"].+['"])?.*?(?:;|$)/gm;

function argToHtml(className = "") {
  return (arg: any) => {
    let value;
    if (arg instanceof Error) {
      value = escapeHtml(
        JSON.stringify(
          { ...arg, message: arg.message, stack: arg.stack },
          null,
          2
        )
      );
    } else if (typeof arg === "object") {
      try {
        value = escapeHtml(
          JSON.stringify(
            arg,
            (key, value) => {
              return typeof value === "bigint" ? value.toString() : value;
            },
            2
          )
        );
      } catch {
        value = escapeHtml(arg);
      }
    } else if (typeof arg === "string") {
      value = escapeHtml(arg);
    } else {
      value = escapeHtml("" + arg);
    }
    const currentDate = new Date();
    const formattedTime = currentDate
      .toISOString()
      .split("T")[1]
      .replace("Z", "")
      .slice(0, -2);
    const timeTag =
      "<span style='color: rgb(151 149 149)'>" + formattedTime + " </span>";
    return `<pre style="white-space:pre-wrap;" class="${className}">${timeTag}${value}</pre>`;
  };
}

function escapeHtml(unsafe: string) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function extractInnerText(obj: any): string {
  let text = "";
  if (obj?.props?.children) {
    if (Array.isArray(obj.props.children)) {
      obj.props.children.forEach((child: any) => {
        text += extractInnerText(child);
      });
    } else {
      text += extractInnerText(obj.props.children);
    }
  } else if (typeof obj === "string") {
    return obj;
  }
  return text.trim(); // Trim the final string to remove any trailing newlines
}

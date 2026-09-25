import { Injectable, Logger } from '@nestjs/common';
import { Project, ScriptTarget, StructureKind } from 'ts-morph';

export interface AstCodeSummary {
  filePath: string;
  classes: {
    name: string;
    decorators: string[];
    methods: { name: string; parameters: string[]; returnType: string; isExported: boolean }[];
    properties: { name: string; type: string }[];
  }[];
  interfaces: {
    name: string;
    properties: { name: string; type: string; isOptional: boolean }[];
  }[];
  functions: {
    name: string;
    parameters: { name: string; type: string }[];
    returnType: string;
    jsDoc?: string;
  }[];
  types: {
    name: string;
    definition: string;
  }[];
  enums: {
    name: string;
    members: string[];
  }[];
}

@Injectable()
export class CodeAnalysisService {
  private readonly logger = new Logger(CodeAnalysisService.name);

  /**
   * Analyze an array of files and extract TypeScript AST metadata using ts-morph
   */
  public analyzeSourceFiles(files: { path: string; content: string }[]): AstCodeSummary[] {
    const tsFiles = files.filter(
      (f) =>
        (f.path.endsWith('.ts') || f.path.endsWith('.tsx')) &&
        !f.path.endsWith('.d.ts')
    );

    if (tsFiles.length === 0) {
      return [];
    }

    try {
      const project = new Project({
        useInMemoryFileSystem: true,
        compilerOptions: {
          target: ScriptTarget.ES2022,
          allowJs: true,
        },
      });

      const summaries: AstCodeSummary[] = [];

      for (const file of tsFiles) {
        try {
          const sourceFile = project.createSourceFile(file.path, file.content, { overwrite: true });

          const classes = sourceFile.getClasses().map((cls) => {
            const decorators = cls.getDecorators().map((d) => d.getName());
            const methods = cls.getMethods().map((m) => ({
              name: m.getName(),
              parameters: m.getParameters().map((p) => `${p.getName()}: ${p.getType().getText()}`),
              returnType: m.getReturnType().getText(),
              isExported: cls.isExported(),
            }));
            const properties = cls.getProperties().map((p) => ({
              name: p.getName(),
              type: p.getType().getText(),
            }));

            return {
              name: cls.getName() || 'AnonymousClass',
              decorators,
              methods,
              properties,
            };
          });

          const interfaces = sourceFile.getInterfaces().map((intf) => ({
            name: intf.getName(),
            properties: intf.getProperties().map((p) => ({
              name: p.getName(),
              type: p.getType().getText(),
              isOptional: p.hasQuestionToken(),
            })),
          }));

          const functions = sourceFile.getFunctions().filter((fn) => fn.isExported()).map((fn) => ({
            name: fn.getName() || 'anonymous',
            parameters: fn.getParameters().map((p) => ({
              name: p.getName(),
              type: p.getType().getText(),
            })),
            returnType: fn.getReturnType().getText(),
            jsDoc: fn.getJsDocs().map((d) => d.getDescription()).join('\n'),
          }));

          const types = sourceFile.getTypeAliases().map((t) => ({
            name: t.getName(),
            definition: t.getType().getText(),
          }));

          const enums = sourceFile.getEnums().map((e) => ({
            name: e.getName(),
            members: e.getMembers().map((m) => m.getName()),
          }));

          summaries.push({
            filePath: file.path,
            classes,
            interfaces,
            functions,
            types,
            enums,
          });
        } catch (fileErr) {
          this.logger.debug(`Could not parse AST for ${file.path}: ${fileErr.message}`);
        }
      }

      return summaries;
    } catch (err) {
      this.logger.error('Failed to run ts-morph analysis:', err);
      return [];
    }
  }

  /**
   * Format AST summary into an enriched text snippet for the LLM prompt
   */
  public formatAstForPrompt(summaries: AstCodeSummary[]): string {
    if (summaries.length === 0) return 'No TypeScript AST metadata available.';

    return summaries
      .map((s) => {
        const parts: string[] = [`File: ${s.filePath}`];

        if (s.classes.length > 0) {
          parts.push(
            '  Classes:\n' +
              s.classes
                .map((c) => {
                  const deco = c.decorators.length ? `[@${c.decorators.join(', @')}] ` : '';
                  const methods = c.methods.map((m) => `    ${m.name}(${m.parameters.join(', ')}): ${m.returnType}`).join('\n');
                  return `  - ${deco}class ${c.name}\n${methods}`;
                })
                .join('\n')
          );
        }

        if (s.interfaces.length > 0) {
          parts.push(
            '  Interfaces:\n' +
              s.interfaces
                .map((i) => `  - interface ${i.name} { ${i.properties.map((p) => `${p.name}${p.isOptional ? '?' : ''}: ${p.type}`).join('; ')} }`)
                .join('\n')
          );
        }

        if (s.functions.length > 0) {
          parts.push(
            '  Functions:\n' +
              s.functions
                .map((f) => `  - ${f.name}(${f.parameters.map((p) => `${p.name}: ${p.type}`).join(', ')}): ${f.returnType}${f.jsDoc ? ` /* ${f.jsDoc.trim()} */` : ''}`)
                .join('\n')
          );
        }

        if (s.types.length > 0) {
          parts.push(
            '  Type Aliases:\n' +
              s.types.map((t) => `  - type ${t.name} = ${t.definition}`).join('\n')
          );
        }

        return parts.join('\n');
      })
      .join('\n\n');
  }
}

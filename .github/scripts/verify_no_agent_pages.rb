# frozen_string_literal: true

require "pathname"

destination = Pathname(ARGV.fetch(0, "_site"))
abort "Site destination does not exist: #{destination}" unless destination.directory?

agent_names = %w[agent claude codex gemini opencode].freeze
agent_workspace_roots = %w[.agents .claude .codex .omx .vscode].freeze
page_extensions = %w[.html .md].freeze

leaks = destination.glob("**/*", File::FNM_DOTMATCH).filter_map do |path|
  next unless path.file?

  relative = path.relative_path_from(destination).to_s.tr("\\", "/")
  basename = File.basename(relative).downcase
  root = relative.downcase.split("/", 2).first
  next unless agent_workspace_roots.include?(root) ||
              basename.start_with?(".agent-workbench.") ||
              basename == "opencode.json" ||
              (page_extensions.include?(File.extname(basename)) && agent_names.any? { |name| basename.include?(name) })

  relative
end.sort

if leaks.any?
  warn "Agent or workspace files were published:"
  leaks.each { |path| warn "- #{path}" }
  exit 1
end

puts "AGENT_WORKSPACE_PUBLICATION_CHECK=PASS"

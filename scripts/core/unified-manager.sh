# CLI Interface

cli_main() {
    case "$1" in
        "deps")
            audit_dependencies
            ;;
        "scripts")
            audit_scripts
            ;;
        "health")
            check_system_health
            ;;
        "help"|*)
            echo "Usage: $0 {deps|scripts|health|help}"
            echo "  deps    - Audit and manage dependencies"
            echo "  scripts - Audit and manage scripts"
            echo "  health  - Check system health"
            echo "  help    - Show this help"
            ;;
    esac
}

# Main execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    cli_main "$@"
fi

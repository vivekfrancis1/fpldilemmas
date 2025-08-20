export default function Footer() {
  return (
    <footer className="bg-fpl-purple text-white mt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4" data-testid="text-footer-title">FPL Manager Tools</h3>
            <p className="text-purple-200 text-sm" data-testid="text-footer-description">
              Advanced analytics and insights for Fantasy Premier League managers. Make smarter decisions with real-time data.
            </p>
          </div>
          <div>
            <h4 className="text-md font-semibold mb-4" data-testid="text-coming-soon">Coming Soon</h4>
            <ul className="space-y-2 text-sm text-purple-200">
              <li data-testid="text-feature-1">Fixture Difficulty Analyzer</li>
              <li data-testid="text-feature-2">Price Change Predictor</li>
              <li data-testid="text-feature-3">Transfer Planner</li>
              <li data-testid="text-feature-4">League Comparison Tool</li>
            </ul>
          </div>
          <div>
            <h4 className="text-md font-semibold mb-4" data-testid="text-data-source">Data Source</h4>
            <p className="text-purple-200 text-sm" data-testid="text-data-description">
              All data sourced from the official Fantasy Premier League API. Updated regularly during the season.
            </p>
          </div>
        </div>
        <div className="border-t border-purple-600 mt-8 pt-8 text-center text-sm text-purple-200">
          <p data-testid="text-copyright">&copy; 2024 FPL Manager Tools. Not affiliated with the Premier League or Fantasy Premier League.</p>
        </div>
      </div>
    </footer>
  );
}

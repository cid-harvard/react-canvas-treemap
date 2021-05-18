import React from 'react'
import {
  HashRouter as Router,
  Route,
  Switch,
} from 'react-router-dom';
import Landing from './pages/Landing';
import ToggleDemo from './pages/ToggleDemo';
import DigitDemo from './pages/DigitDemo';
import ComparisonDemo from './pages/ComparisonDemo';
import ExternalTooltipTrigger from './pages/ExternalTooltipTrigger';

const App = () => {

  return (
    <div>
      <Router>
          <Switch>
              <Route exact path={'/toggle'} component={ToggleDemo} />
              <Route exact path={'/digit'} component={DigitDemo} />
              <Route exact path={'/compare'} component={ComparisonDemo} />
              <Route exact path={'/external-tooltip'} component={ExternalTooltipTrigger} />
            <Route component={Landing} />
          </Switch>
        </Router>
    </div>
  );
}

export default App

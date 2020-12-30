import React, {Component} from 'react';
import ReactDOM from 'react-dom';


// theme
import { MuiThemeProvider } from "@material-ui/core/styles";
import CssBaseline from "@material-ui/core/CssBaseline";

import "react-perfect-scrollbar/dist/css/styles.css";
import "assets/scss/style.scss";
import theme from "themes/theme";

// SafeProvider
import SafeProvider from '@gnosis.pm/safe-apps-react-sdk';

// hot reload
import { hot } from "react-hot-loader/root";

// import App from './App';

export class App extends Component {
  render() {
      return (
        <MuiThemeProvider theme={theme}>
            <CssBaseline />
            <SafeProvider
              loader={
                <>
                  Waiting for Safe...
                </>
              }
            >
              Connected. Show components here
            </SafeProvider>
        </MuiThemeProvider>
      );
  }
}

const AppWithHotReload = hot(App);

ReactDOM.render(
  <AppWithHotReload />,
  document.getElementById("root") || document.createElement("div")
);
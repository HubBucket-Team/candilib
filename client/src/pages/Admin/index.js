import React, { Component } from 'react';
import {
  Route,
  withRouter,
} from "react-router-dom";
import { connect } from 'react-redux';

import Login from './Login/Login'
import AdminPage from './AdminPage/AdminPage'
import { checkAdminToken, resetToken } from '../../store/Auth/Auth.actions';
import PrivateRoute from '../../util/PrivateRoute';
import { Button } from '../../components/index';

const SignOutButton = withRouter(
  ({ history, isAuthenticated, signout }) => (
    isAuthenticated ? (
      <Button
        variant="contained"
        onClick={() => {
          signout(() => history.push("/admin-login"));
        }}
      >
        Déconnexion
      </Button>
    ) : null
  )
);

class Auth extends Component {
  componentDidMount() {
    this.props.checkAdminToken();
  }

  render () {
    const { isAuthenticated, signout } = this.props;
    return (
      <div>
        <SignOutButton signout={signout} isAuthenticated={isAuthenticated} />
        <Route path="/admin-login" component={Login} />
        <PrivateRoute
          path="/admin"
          redirectTo="/admin-login"
          isAccessGranted={isAuthenticated}
          component={AdminPage}
        />
      </div>
    );
  }
}

const mapStateToProps = ({ auth: { isAuthenticated } }) => ({
  isAuthenticated,
})

const mapDispatchToProps = {
  signout: resetToken,
  checkAdminToken,
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(Auth));

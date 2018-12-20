import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import 'whatwg-fetch';
import {
  Paper,
  Button,
  FormControl,
  Input,
  InputLabel,
  withStyles,
  CssBaseline,
  Snackbar,
} from '@material-ui/core';
import { Circle } from 'better-react-spinkit';
import debounce from 'debounce-fn';
import latinize from 'latinize';

import blue from '@material-ui/core/colors/blue';
import SnackbarNotification from '../../../../components/Notifications/SnackbarNotificationWrapper';
import AutoCompleteAddresses from '../../../../components/AutoCompleteAddresses/AutoCompleteAddresses';
import { errorsConstants } from '../errors.constants';
import { setInStorage } from '../../../../util/storage';
import {
  email as emailRegex,
  phone as phoneRegex,
} from '../../../../lib/regex';
import api from '../../../../api';
import { checkToken } from '../../../../store/Auth/Auth.actions';

const styles = theme => ({
  layout: {
    width: 'auto',
    marginLeft: theme.spacing.unit * 3,
    marginRight: theme.spacing.unit * 3,
    [theme.breakpoints.up(400 + theme.spacing.unit * 3 * 2)]: {
      width: 400,
      marginLeft: 'auto',
      marginRight: 'auto',
    },
  },
  paper: {
    marginTop: theme.spacing.unit * 8,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: `${theme.spacing.unit * 2}px ${theme.spacing.unit * 3}px ${theme
      .spacing.unit * 3}px`,
  },
  avatar: {
    margin: theme.spacing.unit,
    backgroundColor: theme.palette.secondary.main,
  },
  form: {
    marginTop: theme.spacing.unit,
  },
  submit: {
    marginTop: theme.spacing.unit * 3,
  },
  wrapper: {
    margin: theme.spacing.unit,
    position: 'relative',
  },
  buttonProgress: {
    margin: theme.spacing.unit * 2,
    color: blue[500],
    position: 'absolute',
    top: '-30%',
    left: '40%',
  },
  buttonLogin: {
    textTransform: 'none',
    fontSize: 10,
  },
  snackbar: {
    position: 'absolute',
  },
  snackbarContent: {
    width: theme.spacing.unit * 150,
  },
  textField: {
    width: '100%',
  },
});

class Login extends Component {
  state = {
    isLoading: false,
    isLogin: false,
    success: false,
    neph: '',
    nom: '',
    prenom: '',
    nomUsage: '',
    portable: '',
    adresse: '',
    email: '',
    emailError: false,
    portableError: false,
    emailConfirmation: '',
    emailConfirmationError: false,
    messageSnackbar: '',
    openSnackbar: false,
  };

  componentDidMount() {
    const { location = {} } = this.props;
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    this.props.checkToken(token);
    if (location.state !== undefined) {
      const { error } = location.state;
      if (error !== undefined) {
        const message = errorsConstants[error];

        if (message !== undefined) {
          this.setState({
            success: false,
            openSnackbar: true,
            messageSnackbar: message,
          });
        }
      }
    }
  }

  componentDidUpdate () {
    if (this.props.isAuthenticated) {
      this.props.history.replace('/calendar');
    }
  }

  debouncedValidateField = debounce(
    fieldName => {
      switch (fieldName) {
      case 'email':
        this.checkEmailValidity();
        break;
      case 'emailConfirmation':
        this.checkEmailConfirmation();
        break;
      default:
        break;
      }
    },
    { wait: 300 },
  );

  handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    this.setState({
      openSnackbar: false,
    });
  };

  isIdenticalEmail = () => {
    const { email, emailConfirmation } = this.state;
    return email === emailConfirmation;
  };

  checkEmailValidity = openSnackbar => {
    if (!this.state.email) {
      return;
    }
    const isEmailValid = emailRegex.test(this.state.email);
    const newState = {
      emailError: !isEmailValid,

      messageSnackbar: '',
      openSnackbar: false,
      success: false,
    };
    if (!isEmailValid && openSnackbar) {
      newState.messageSnackbar = 'Veuillez vérifier votre adresse email.';
      newState.openSnackbar = true;
    }
    this.setState(newState);
  };

  checkEmailConfirmation = openSnackbar => {
    const isIdenticalEmail = this.isIdenticalEmail();
    const newState = {
      emailConfirmationError: !isIdenticalEmail,
      messageSnackbar: '',
      openSnackbar: false,
      success: false,
    };
    if (!isIdenticalEmail && openSnackbar) {
      newState.messageSnackbar =
        "Veuillez vérifier votre confirmation d'adresse email.";
      newState.openSnackbar = true;
    }
    this.setState(newState);
  };

  checkPhone = openSnackbar => {
    const portable = this.state.portable;
    if (!portable) {
      return;
    }
    const isPhoneValid =
      portable && portable.length === 10 && phoneRegex.test(portable);
    const newState = {
      portableError: !isPhoneValid,
      messageSnackbar: '',
      openSnackbar: !isPhoneValid,
      success: false,
    };
    if (!isPhoneValid && openSnackbar) {
      newState.messageSnackbar = 'Veuillez vérifier votre numéro de téléphone.';
      newState.openSnackbar = true;
    }
    this.setState(newState);
  };

  handleChange = ({ target: { name, value } }) => {
    const saneValue = name === 'nom' ? latinize(value).toUpperCase() : value
    this.setState(
      {
        [name]: saneValue,
      },
      () => this.debouncedValidateField(name),
    );
  };

  handleCreate = e => {
    e.preventDefault();

    const isLogin = this.props.location.pathname.includes('connexion')

    const {
      neph,
      nom,
      nomUsage,
      email,
      emailConfirmation,
      prenom,
      portable,
      adresse,
    } = this.state;
    this.setState({
      isLoading: true,
    });
    if (email && emailRegex.test(email)) {
      if (!isLogin) {
        const formData = {
          neph,
          nom,
          nomUsage,
          prenom,
          email,
          emailConfirmation,
          portable,
          adresse,
        };
        api.auth.signup(formData)
          .then(json => {
            if (json.success) {
              setInStorage('candilib', {
                token: json.token,
                id: json.candidat._id,
              });
              this.setState({
                messageSnackbar: json.message,
                openSnackbar: true,
                isLoading: false,
                emailError: false,
                portableError: false,
                neph: '',
                nom: '',
                nomUsage: '',
                email: '',
                emailConfirmation: '',
                emailConfirmationError: false,
                prenom: '',
                portable: '',
                adresse: '',
                success: true,
              });
              return;
            } else {
              this.setState({
                messageSnackbar: json.message ||
                  'Un problème est survenu, veuillez réessayer plus tard. Nous vous présentons nos excuses.',
                portableError: false,
                openSnackbar: true,
                emailError: false,
                isLoading: false,
                success: false,
              });
            }
            if (json.message.includes('email')) {
              this.setState({
                messageSnackbar: json.message ||
                  'Vous avez déjà un compte sur Candilib, veuillez cliquer sur le lien "Déjà inscrit"',
                portableError: false,
                openSnackbar: true,

                emailError: !json.success,
                isLoading: false,
                success: false,
              });
            } else if (json.message.includes('portable')) {
              this.setState({
                portableError: !json.success,
                emailError: false,
                messageSnackbar: 'Vérifier votre numéro de téléphone.',
                openSnackbar: true,
                isLoading: false,
                success: false,
              });
            } else {
              this.setState({
                portableError: false,
                emailError: false,
                messageSnackbar: json.message,
                openSnackbar: true,
                isLoading: false,
                success: false,
              });
            }
          })
          .catch(error => {
            this.setState({
              messageSnackbar:
                'Un problème est survenu, veuillez réessayer plus tard. Nous vous présentons nos excuses.',
              portableError: false,
              openSnackbar: true,
              emailError: false,
              isLoading: false,
              success: false,
            });
          });
      } else {
        api.auth.sendMagicLink(this.state.email)
          .then(({ message, success }) => {
            const partialState = {
              emailError: !success,
              isLoading: false,
              openSnackbar: true,
              messageSnackbar: message,
              success,
            }
            this.setState(partialState)
          })
          .catch(error => {
            this.setState({
              messageSnackbar: error.message ||
                'Un problème est survenu, veuillez réessayer plus tard. Nous vous présentons nos excuses.',
              openSnackbar: true,
              isLoading: false,
              success: false,
            });
          });
      }
    } else {
      this.setState({
        isLoading: false,
      });
    }
  };

  render() {
    const { classes, location } = this.props;
    const isLogin = location.pathname.includes('connexion') // TODO: refactor this
    const {
      isLoading,
      emailError,
      emailConfirmationError,
      portableError,
      neph,
      nom,
      email,
      emailConfirmation,
      prenom,
      portable,
      success,
      openSnackbar,
      messageSnackbar,
    } = this.state;

    return (
      <React.Fragment>
        <CssBaseline />
        <main className={classes.layout}>
          <Paper className={classes.paper}>
            <div style={{ textAlign: 'center' }}>
              {!isLogin && (
                <form className={classes.form} onSubmit={this.handleCreate}>
                  <FormControl margin="normal" required fullWidth>
                    <InputLabel htmlFor="neph">Neph (obligatoire)</InputLabel>
                    <Input
                      type="number"
                      id="neph"
                      name="neph"
                      placeholder="0123456978912"
                      autoFocus
                      autoComplete="neph"
                      value={neph}
                      required
                      onChange={this.handleChange}
                    />
                  </FormControl>
                  <FormControl margin="normal" required fullWidth>
                    <InputLabel htmlFor="nom">Nom (obligatoire)</InputLabel>
                    <Input
                      id="nom"
                      name="nom"
                      placeholder="DUPONT"
                      autoComplete="nom"
                      value={nom}
                      required
                      onChange={this.handleChange}
                    />
                  </FormControl>
                  <FormControl margin="normal" fullWidth>
                    <InputLabel htmlFor="prenom">Prénom</InputLabel>
                    <Input
                      id="prenom"
                      name="prenom"
                      placeholder="Jean"
                      autoComplete="prenom"
                      value={prenom}
                      onChange={this.handleChange}
                    />
                  </FormControl>
                  <FormControl margin="normal" required fullWidth>
                    <InputLabel htmlFor="email">Email (obligatoire)</InputLabel>
                    <Input
                      type="email"
                      id="email"
                      name="email"
                      placeholder="jean.dupont@gmail.com"
                      error={emailError}
                      autoComplete="email"
                      value={email}
                      required
                      onChange={this.handleChange}
                      onBlur={e => this.checkEmailValidity(true)}
                    />
                  </FormControl>
                  <FormControl margin="normal" required fullWidth>
                    <InputLabel htmlFor="emailConfirmation">
                      Confirmation email (obligatoire)
                    </InputLabel>
                    <Input
                      type="email"
                      id="emailConfirmation"
                      error={emailConfirmationError}
                      name="emailConfirmation"
                      placeholder="jean.dupont@gmail.com"
                      autoComplete="emailConfirmation"
                      value={emailConfirmation}
                      onChange={this.handleChange}
                      onBlur={() => this.checkEmailConfirmation(true)}
                    />
                  </FormControl>
                  <FormControl margin="normal" required fullWidth>
                    <InputLabel htmlFor="portable">
                      Portable (obligatoire)
                    </InputLabel>
                    <Input
                      id="portable"
                      error={portableError}
                      name="portable"
                      placeholder="06xxxxxxxx"
                      autoComplete="portable"
                      value={portable}
                      onChange={this.handleChange}
                      onBlur={() => this.checkPhone(true)}
                    />
                  </FormControl>
                  <AutoCompleteAddresses
                    inputName="adresse"
                    handleChange={this.handleChange}
                    placeholder="10 Rue Lecourbe 75015 Paris"
                  />
                  <FormControl margin="normal" required fullWidth>
                    <Button
                      type="submit"
                      color="primary"
                      variant="raised"
                      disabled={isLoading}
                    >
                      Inscription
                    </Button>
                    {isLoading && (
                      <Circle size={25} className={classes.buttonProgress} />
                    )}
                  </FormControl>
                  <FormControl margin="normal" className={classes.buttonLogin}>
                    <Link to="/connexion" className={classes.buttonLogin}>
                      <Button
                        color="primary"
                        onClick={() => this.setState({ isLogin: true })}
                      >
                        Déjà inscrit ?
                      </Button>
                      </Link>
                  </FormControl>
                </form>
              )}
              {isLogin && (
                <form className={classes.form} onSubmit={this.handleCreate}>
                  <FormControl margin="normal" required fullWidth>
                    <InputLabel htmlFor="email">Email</InputLabel>
                    <Input
                      type="email"
                      id="email"
                      error={emailError}
                      name="email"
                      autoComplete="email"
                      value={email}
                      autoFocus
                      onChange={this.handleChange}
                    />
                  </FormControl>

                  <FormControl margin="normal" required fullWidth>
                    <Button
                      type="submit"
                      color="primary"
                      variant="raised"
                      disabled={isLoading}
                    >
                      Connexion
                    </Button>
                    {isLoading && (
                      <Circle size={25} className={classes.buttonProgress} />
                    )}
                  </FormControl>
                  <FormControl margin="normal" fullWidth>
                    <Link to="/inscription" className={classes.buttonLogin}>
                      <Button
                        color="primary"
                        onClick={() => this.setState({ isLogin: false })}
                      >
                        Inscription
                      </Button>
                    </Link>
                  </FormControl>
                </form>
              )}
            </div>
          </Paper>
        </main>
        <Snackbar
          open={openSnackbar}
          autoHideDuration={8000}
          onClose={this.handleClose}
          className={classes.snackbar}
        >
          <SnackbarNotification
            onClose={this.handleClose}
            variant={success ? 'success' : 'error'}
            className={classes.snackbarContent}
            message={messageSnackbar}
          />
        </Snackbar>
      </React.Fragment>
    );
  }
}

Login.defaultProps = {
  location: {},
};

Login.propTypes = {
  classes: PropTypes.object.isRequired,
  location: PropTypes.object.isRequired,
};

const mapStateToProps = (state) => ({
  isAuthenticated: state.auth.isAuthenticated,
})

const mapDispatchToProps = {
  checkToken,
};

export default withStyles(styles)(connect(mapStateToProps, mapDispatchToProps)(Login));

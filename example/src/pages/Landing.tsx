import React from 'react';
import styled from 'styled-components/macro';
import { Link } from 'react-router-dom';

const ListItem = styled.li`
  font-size: 1rem;
  margin-bottom: 0.85rem;

  a {
    color: rgb(78, 140, 141); 
    text-decoration: none;
    border-bottom: solid 1px rgb(78, 140, 141);
  }
`;

export default () => {
  return (
    <ul>
      <ListItem><Link to={'/toggle'}>Toggle data demo</Link></ListItem>
      <ListItem><Link to={'/digit'}>1 - 6 digit demo</Link></ListItem>
      <ListItem><Link to={'/compare'}>Comparison demo</Link></ListItem>
    </ul>
  );
}
